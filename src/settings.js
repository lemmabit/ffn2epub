const prefix = 'ffn2epub:';

export function get(name, def) {
  const value = unsafeWindow.localStorage.getItem(prefix + name);
  if(value == null) {
    return def;
  } else {
    try {
      return JSON.parse(value);
    } catch(e) {
      return def;
    }
  }
}

export function set(name, value) {
  unsafeWindow.localStorage.setItem(prefix + name, JSON.stringify(value));
}
