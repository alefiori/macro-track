import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
  },
  preset: {
    ...minimal2023Preset,
    // Maskable + apple icons get a solid background matching the brand so the
    // SVG's transparent corners don't show through on iOS/Android launchers.
    maskable: {
      ...minimal2023Preset.maskable,
      resizeOptions: {
        background: '#00685f',
        fit: 'contain',
      },
    },
    apple: {
      ...minimal2023Preset.apple,
      resizeOptions: {
        background: '#00685f',
        fit: 'contain',
      },
    },
  },
  images: ['public/icon.svg'],
})
