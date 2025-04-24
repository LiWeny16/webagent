import { defineManifest } from '@crxjs/vite-plugin'
import packageData from '../package.json'

//@ts-ignore
const isDev = process.env.NODE_ENV == 'development'

export default defineManifest({
  name: `${packageData.displayName || packageData.name}${isDev ? ` ➡️ Dev` : ''}`,
  description: packageData.description,
  version: packageData.version,
  manifest_version: 3,
  icons: {
    16: 'img/16.png',
    32: 'img/32.png',
    48: 'img/48.png',
    128: 'img/128.png',
  },
  action: {
    // default_popup: 'popup.html',
    default_icon: 'img/48.png',
  },
  options_page: 'options.html',
  devtools_page: 'devtools.html',
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['http://*/*', 'https://*/*'],
      js: ['src/contentScript/index.ts'],
    },
  ],
  // side_panel: {
  //   default_path: 'sidepanel.html',
  // },
  // web_accessible_resources: [
  //   {
  //     resources: ['img/logo-16.png', 'img/logo-32.png', 'img/logo-48.png', 'img/logo-128.png'],
  //     matches: [],
  //   },
  // ],
  web_accessible_resources: [
    {
      resources: [
        'panel.html',
        'img/*.png',
        'panel.html', // 如果需要直接嵌入 popup.html
        "offscreen.html",
      ],
      matches: ['<all_urls>'],
    },
  ],

  permissions: ['storage', "tabs", "scripting", "activeTab", "clipboardWrite", "offscreen"],
  host_permissions: ["<all_urls>"]
  // chrome_url_overrides: {
  //   newtab: 'newtab.html',
  // },
})
