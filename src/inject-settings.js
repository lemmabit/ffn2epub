import * as Settings from './settings.js';

import resources_settings_html from './resources/settings.html';

if(/\/manage_user\/local_settings|\?view=local_settings/.test(location.href)) {
  // It's the settings page. Better show the user some settings.
  // As soon as the page is finished loading, that is.
  // I could use MutationObserver to make this more seamless, but that would
  // be silly.
  window.addEventListener('DOMContentLoaded', () => {
    const settingsTbody = document.createElement('tbody');
    settingsTbody.innerHTML = resources_settings_html;
    
    const finishTbody = document.getElementById('saved_message').closest('tbody');
    finishTbody.parentNode.insertBefore(settingsTbody, finishTbody);
    
    const includeAuthorsNotesInput = settingsTbody.querySelector('input[name="include_authors_notes"]');
    includeAuthorsNotesInput.checked = Settings.get('includeAuthorsNotes', true);
    const epubVersionSelect = settingsTbody.querySelector('select[name="epub_version"]');
    epubVersionSelect.value = Settings.get('epubVersion', '3.0');
    
    finishTbody.querySelector('button').addEventListener('click', () => {
      Settings.set('includeAuthorsNotes', includeAuthorsNotesInput.checked);
      Settings.set('epubVersion', epubVersionSelect.value);
    }, true);
  });
}
