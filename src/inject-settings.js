import * as Settings from './settings.js';

import resources_settings_html from './resources/settings.html';

const settingsConfig = [
  {
    key: 'centerHeadings',
    defaultValue: true,
    selector: 'input[name="center_headings"]',
    property: 'checked',
  },
  {
    key: 'autoHyphens',
    defaultValue: 'unspecified',
    selector: 'select[name="automatic_hyphens"]',
    property: 'value',
  },
  {
    key: 'epubVersion',
    defaultValue: '3.0',
    selector: 'select[name="epub_version"]',
    property: 'value',
  },
];

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
    
    for(let i = 0; i < settingsConfig.length; ++i) {
      const { key, defaultValue, selector, property } = settingsConfig[i];
      settingsTbody.querySelector(selector)[property] = Settings.get(key, defaultValue);
    }
    
    finishTbody.querySelector('button').addEventListener('click', () => {
      for(let i = 0; i < settingsConfig.length; ++i) {
        const { key, selector, property } = settingsConfig[i];
        Settings.set(key, settingsTbody.querySelector(selector)[property]);
      }
    }, true);
  });
}

export function getSettings() {
  const out = Object.create(null);
  for(let i = 0; i < settingsConfig.length; ++i) {
    const { key, defaultValue } = settingsConfig[i];
    out[key] = Settings.get(key, defaultValue);
  }
  return out;
}
