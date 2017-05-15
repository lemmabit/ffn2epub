import * as Pako from 'pako/lib/deflate.js';
//import * as PakoConstants from 'pako/lib/zlib/constants.js';
import { calculateCRC32 } from './crc32.js';
import { makeSafeUint8Array } from './utils.js';

function getDOSDateTime(now) {
  return {
    date: (
             now.getUTCDate() |
            (now.getUTCMonth() + 1 << 5) |
            (now.getUTCFullYear() - 1980 << 9)
          ) & 0xFFFF,
    time: (
            (now.getUTCSeconds() >> 1) |
            (now.getUTCMinutes() << 5) |
            (now.getUTCHours() << 11)
          ) & 0xFFFF,
  };
}

function littleEndian32(number) {
  return new Uint8Array([
    number & 0xFF,
    (number >>> 8) & 0xFF,
    (number >>> 16) & 0xFF,
    (number >>> 24) & 0xFF,
  ]);
}

function littleEndian16(number) {
  return new Uint8Array([
    number & 0xFF,
    (number >>> 8) & 0xFF,
  ]);
}

export function create() {
  const dosDateTime = getDOSDateTime(new Date());
  
  const files = [];
  const directoryNames = new Set();
  const fileNames = new Set();
  
  function addDirectory(name) {
    if(!directoryNames.has(name)) {
      if(fileNames.has(name)) {
        throw Error(`Tried to pack a directory named "${name}", but a file already had that name!`);
      }
      
      files.push({
        name,
        compression: 'none',
        //externalAttributes: 0x10,
        type: 'directory',
        contents: undefined,
      });
      directoryNames.add(name);
      fileNames.add(name);
    }
  }
  
  function addFile(name, contents, options) {
    const compression = (options && options.compression) || 'deflate';
    
    if(fileNames.has(name)) {
      throw Error(`Tried to pack two files both named "${name}"!`);
    }
    
    const directoryName = name.slice(0, name.lastIndexOf('/') + 1);
    if(directoryName) {
      addDirectory(directoryName);
    }
    
    files.push({
      name,
      compression,
      //externalAttributes: 0x20,
      type: 'file',
      contents,
    });
    fileNames.add(name);
  }
  
  // returns a Promise that resolves to a Blob.
  function generate() {
    const filePromises = files.map(({ name, compression, type, contents }) => Promise.resolve(contents).then(contents => {
      if(contents instanceof Blob) {
        return new Promise((resolve, reject) => {
          const fileReader = new FileReader();
          fileReader.onload = event => {
            resolve({
              name,
              compression,
              type,
              contents: makeSafeUint8Array(new Uint8Array(event.target.result)),
            });
          };
          fileReader.onerror = fileReader.onabort = reject;
          fileReader.readAsArrayBuffer(contents);
        });
      } else {
        if(contents == null) {
          contents = new Uint8Array([]);
        }
        if(typeof contents === 'string') {
          contents = new TextEncoder().encode(contents);
        }
        if(contents instanceof ArrayBuffer) {
          contents = new Uint8Array(contents);
        }
        contents = makeSafeUint8Array(contents);
        
        return {
          name,
          compression,
          type,
          contents,
        };
      }
    }));
    
    return Promise.all(filePromises.map(file => file.then(realizedFile => {
      let { name, compression, type, contents } = realizedFile;
      const uncompressedSize = realizedFile.uncompressedSize = contents.byteLength;
      const crc32 = realizedFile.crc32 = calculateCRC32(contents);
      if(compression === 'deflate') {
        contents = realizedFile.contents = Pako.deflateRaw(contents, { level: 9 });
      }
      const nameBytes = realizedFile.nameBytes = new TextEncoder().encode(name);
      const localRecord = [
        littleEndian32(0x04034b50), // local file header signature
        littleEndian16(compression === 'deflate' ? 20 : 10), // version needed to extract
        littleEndian16(0), // "general purpose bit flag", whatever that is!! loool XDXD
        littleEndian16(compression === 'deflate' ? 8 : 0), // compression method
        littleEndian16(dosDateTime.time), // last mod file time
        littleEndian16(dosDateTime.date), // last mod file date
        littleEndian32(crc32), // crc-32
        littleEndian32(contents.byteLength), // compressed size
        littleEndian32(uncompressedSize), // uncompressed size
        littleEndian16(nameBytes.byteLength), // file name length
        littleEndian16(0), // extra field length. who knows what that's for??
        nameBytes,
        contents,
      ];
      return { realizedFile, localRecord };
    })))
    .then(realizedFiles => {
      const data = Array.prototype.concat.apply([], realizedFiles.map(x => x.localRecord));
      let byteIndex = 0, cdLength = 0;
      for(let fileIndex = 0; fileIndex < filePromises.length; ++fileIndex) {
        const { realizedFile, localRecord } = realizedFiles[fileIndex];
        const { name, compression, type, contents, uncompressedSize, crc32, nameBytes } = realizedFile;
        data.push(
          littleEndian32(0x02014b50), // central file header signature
          littleEndian16(0x20), // version made by
          littleEndian16(compression === 'deflate' ? 20 : 10), // version needed to extract
          littleEndian16(0), // general purpose bit flag
          littleEndian16(compression === 'deflate' ? 8 : 0), // compression method
          littleEndian16(dosDateTime.time), // last mod file time
          littleEndian16(dosDateTime.date), // last mod file date
          littleEndian32(crc32), // crc-32
          littleEndian32(contents.byteLength), // compressed size
          littleEndian32(uncompressedSize), // uncompressed size
          littleEndian16(nameBytes.byteLength), // file name length
          littleEndian32(0), // extra field length / file comment length
          littleEndian32(0), // disk number start / internal file attributes
          littleEndian32(type === 'directory' ? 0x10 : 0x20), // external file attributes
          littleEndian32(byteIndex), // relative offset of local header
          nameBytes,
        );
        cdLength += 46 + nameBytes.byteLength;
        for(let i = 0; i < localRecord.length; ++i) {
          byteIndex += localRecord[i].byteLength;
        }
      }
      data.push(
        littleEndian32(0x06054b50), // end of central dir signature
        littleEndian32(0), // number of this disk / number of the disk with the start of the central directory
        littleEndian16(filePromises.length), // total number of entries in the central directory on this disk
        littleEndian16(filePromises.length), // total number of entries in the central directory
        littleEndian32(cdLength), // size of the central directory
        littleEndian32(byteIndex), // offset of start of central directory with respect to the starting disk number
        littleEndian16(0), // .ZIP file comment length
      );
      return new Blob(data, { type: 'application/epub+zip' });
    });
  }
  
  addFile('mimetype', 'application/epub+zip', { compression: 'none' });
  addDirectory('META-INF/');
  
  return {
    addDirectory,
    addFile,
    generate,
  };
}
