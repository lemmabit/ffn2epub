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

if(/\/manage\/local-settings/.test(location.href)) {
  // It's the settings page. Better show the user some settings.
  // As soon as the page is finished loading, that is.
  // I could use MutationObserver to make this more seamless, but that would
  // be silly.
  window.addEventListener('DOMContentLoaded', () => {
    const settingsTbody = document.createElement('tbody');
    settingsTbody.innerHTML = resources_settings_html;
    
    const finishTbody = document.querySelector('#local_site_settings tbody');
    while(settingsTbody.firstChild) {
      const el = settingsTbody.firstChild;
      settingsTbody.removeChild(el);
      finishTbody.appendChild(el);
    }
    
    for(let i = 0; i < settingsConfig.length; ++i) {
      const { key, defaultValue, selector, property } = settingsConfig[i];
      const element = finishTbody.querySelector(selector);
      element[property] = Settings.get(key, defaultValue);
      const doSet = ({ target }) => {
        Settings.set(key, element[property]);
      };
      ['change', 'input', 'click', 'submit'].forEach(name => {
        element.addEventListener(name, doSet, false);
      });
    }
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
