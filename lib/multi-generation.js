const plantuml = require('./node-plantuml')
const fs = require('fs')
const { readdir, readFile, mkdir, stat } = require('fs/promises')
const path = require('path')

const myArgs = process.argv.slice(2)
const plantUmlExtension = '.puml'

for (const arg of myArgs) {
  isDirectory(arg).then(directory => {
    if (directory) {
      recursivePlantUmlFileSearch(arg).then(plants => {
        const flatPlants = plants.flat(Infinity)
        for (const plant of flatPlants) {
          renderPlantUmlDocument(plant)
        }
      })
    } else {
      renderPlantUmlDocument(arg)
    }
  })
}

/**
 * Depth first recursion creating an array of all the file paths for Plant UML documents under the given directory root.
 */
async function recursivePlantUmlFileSearch (directory) {
  const files = await readdir(directory)
  let plants = []

  for (const file of files) {
    const subFile = directory + path.sep + file

    if (await isDirectory(subFile)) {
      const leaves = await recursivePlantUmlFileSearch(subFile)
      if (leaves.length > 0) {
        plants.push(leaves)
      }
    } else {
      if (hasPlantUmlExtension(subFile)) {
        plants.push(subFile)
      }
    }
  }

  return plants
}

/**
 * Creates a rendering from a Plant UML file.
 */
async function renderPlantUmlDocument (filepath) {
  const targetFile = path.parse(filepath)
  validatePlantUmlExtensionType(targetFile.ext)

  const content = await readFile(filepath, 'utf8')
  validateNonEmptyContent(content, filepath)

  const len = (content.match(/newpage/g) || []).length

  const targetDirectory = targetFile.dir + path.sep + 'images' + path.sep
  await createDirectoryStructure(targetDirectory)

  for (let i = 0; i <= len; i++) {
    await renderPage(content, i, targetDirectory, targetFile.name)
  }
}

/**
 * Creates a render of a single page in a potentially multi-page Plant UML document.
 */
async function renderPage (content, page, targetDirectory, targetNamePrefix) {
  const generated = plantuml.generate(content, {
    format: 'svg',
    pipeimageindex: page
  })

  const outputFile = targetDirectory + targetNamePrefix + '-' + page + '.svg'

  console.log('Begun generation of ' + outputFile)

  generated.out.pipe(fs.createWriteStream(outputFile)).on('finish', (_) => {
    console.log('Finished generation of ' + outputFile)
  })
}

/**
 * Recursively creates the given directory structure, quietly.
 */
async function createDirectoryStructure (target) {
  try {
    await mkdir(target, { recursive: true })
  } catch (err) {
    //  nop if directory doesn't exist
    console.info('Failed to create directory: %s, %s', target, err)
  }
}

/**
 * Determine whether a directory exists at the given `path`.
 */
async function isDirectory (path) {
  const stats = await stat(path)

  return stats.isDirectory()
}

/**
 * Whether the file (path, filename or extension) has the extension that matches a Plant UML extension.
 */
function hasPlantUmlExtension (file) {
  return file.toLowerCase().endsWith(plantUmlExtension)
}

/**
 * Validates that the extension matches a Plant UML extension.
 */
function validatePlantUmlExtensionType (extension) {
  if (!hasPlantUmlExtension(extension)) {
    throw Error('Expecting a .puml extension, instead got: ' + extension)
  }
}

/**
 * Validates that the content is not empty, using the filepath in the error message.
 */
function validateNonEmptyContent (content, filepath) {
  if (content.length === 0) {
    throw Error('Content must not be empty, however not true for ' + filepath)
  }
}
