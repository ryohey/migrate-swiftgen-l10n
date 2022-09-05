import camelCase from "camelcase"
import fs from "fs/promises"
import recursive from "recursive-readdir"

function convertKey(str) {
  const [last, ...tokens] = str.split(".").reverse()
  const last2 = camelCase(last) // 最後の部分文字列は小文字始まり
  const tokens2 = tokens.map((t) =>
    camelCase(t, {
      pascalCase: true, // 最後以外の部分文字列は大文字始まり
      preserveConsecutiveUppercase: true, // UIAlert のような大文字を維持する
    })
  )
  return [last2, ...tokens2].reverse().join(".")
}

const targetPath = process.argv[2]
console.log(targetPath)
const files = await recursive(targetPath, [(file) => !file.endsWith(".swift")])

for (const file of files) {
  console.log(file)
  const text = await fs.readFile(file, "utf-8")
  const newText = text.replaceAll(
    /NSLocalizedString\("(.+)", comment: ".+"\)/gm,
    (match, p1) => {
      const key = convertKey(p1)
      const result = `L10n.${key}`
      console.log(`Replace ${match} to ${result}`)
      return result
    }
  )
  await fs.writeFile(file, newText, "utf-8")
}
