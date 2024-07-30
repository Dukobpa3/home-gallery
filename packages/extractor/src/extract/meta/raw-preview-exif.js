import Logger from '@home-gallery/logger'

const log = Logger('extractor.image.rawPreview')

const rawPreviewSuffix = 'raw-preview.jpg'
const rawPreviewExifSuffix = 'raw-preview-exif.json'

/**
 * @param {import('@home-gallery/types').TStorage} storage
 * @param {ExifTool} exifTool
 * @returns {import('stream').Transform}
 */
export const rawPreviewExif = (storage, exifTool) => {
  const test = entry => { 
    return storage.hasFile(entry, rawPreviewSuffix) && !storage.hasFile(entry, rawPreviewExifSuffix)
  }

  const task = async (entry) => {
    const t0 = Date.now()
    const previewFile = await storage.createLocalFile(entry, rawPreviewSuffix)
    return exifTool.read(previewFile.file)
      .then(async tags => {
        await storage.writeFile(entry, rawPreviewExifSuffix, tags)
        log.debug(t0, `Read exif meta data from raw preview of ${entry}`)
      })
      .catch(err => {
        log.warn(err, `Could not extract raw preview image of ${entry}: ${err}`)
        cb()
      })
      .finally(() => previewFile.release())
  }

  return {
    test,
    task
  }
}

/**
 * @type {import('@home-gallery/types').TExtractorPlugin}
 */
export const rawPreviewExifPlugin = {
  name: 'rawPreviewExif',
  phase: 'file',
  /**
   * @param {import('@home-gallery/types').TExtractorContext} context
   */
  async create(context, config) {
    const { storage, exifTool } = context

    return rawPreviewExif(storage, exifTool)
  },
}
