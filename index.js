import camelCase from "camelcase"
import fs from "fs/promises"
import recursive from "recursive-readdir"

function convertKey(str) {
  // 事前に処理
  const cleanStr = str
    .replaceAll(/[,:\/%@\(\)\?\!]/gm, " ") // 対応できない文字はスペースにする
    .replaceAll(/\.+/gm, ".") // . の連続はひとつの . に
    .replace(/\.$/, "") // 末尾の . を消す

  const [last, ...tokens] = cleanStr.split(".").reverse()

  // FAQ のように全部大文字だったら faq のように小文字にする
  if (tokens.length === 0 && last === last.toUpperCase()) {
    return camelCase(last)
  }

  const last2 = camelCase(last, { preserveConsecutiveUppercase: true }) // 最後の部分文字列は小文字始まり
  const tokens2 = tokens.map((t) =>
    camelCase(t, {
      pascalCase: true, // 最後以外の部分文字列は大文字始まり
      preserveConsecutiveUppercase: true, // UIAlert のような大文字を維持する
    })
  )
  return [last2, ...tokens2].reverse().join(".")
}

function convertKeyObjC(str) {
  return convertKey(str.replaceAll(/\./gm, " ")) // . でネストしない
}

const insertAt = (str, sub, pos) =>
  `${str.slice(0, pos)}${sub}${str.slice(pos)}`

const targetPath = process.argv[2]
const isDryRun = process.argv[3] === "--dry-run"

const swiftFiles = await recursive(targetPath, [
  (file, stats) => !stats.isDirectory() && !file.endsWith(".swift"),
])

for await (const file of swiftFiles) {
  const text = await fs.readFile(file, "utf-8")
  const newText = text
    .replaceAll(
      /String\(format: NSLocalizedString\("([^"]+?)", comment: ".*?"\), (.+?)\)/gm,
      (match, p1, p2) => {
        const key = convertKey(p1)
        const result = `L10n.${key}(${p2})`
        console.log(`Replace ${match} to ${result}`)
        return result
      }
    )
    .replaceAll(
      /NSLocalizedString\("([^"]+?)", comment: ".*?"\)/gm,
      (match, p1) => {
        const key = convertKey(p1)
        const result = `L10n.${key}`
        console.log(`Replace ${match} to ${result}`)
        return result
      }
    )
  if (!isDryRun) {
    await fs.writeFile(file, newText, "utf-8")
  }
}

const objcFiles = await recursive(targetPath, [
  (file, stats) => !stats.isDirectory() && !file.endsWith(".m"),
])

for await (const file of objcFiles) {
  const text = await fs.readFile(file, "utf-8")
  let newText = text
    .replaceAll(
      /\[NSString stringWithFormat:NSLocalizedString\(@"([^"]+?)",.+?\), (.+?)\]/gm,
      (match, p1, p2) => {
        const key = convertKeyObjC(p1)
        const result = `[Localizable ${key}WithValue:${p2}]`
        console.log(`Replace ${match} to ${result}`)
        return result
      }
    )
    .replaceAll(/NSLocalizedString\(@"([^"]+?)", .+?\)/gm, (match, p1) => {
      const key = convertKeyObjC(p1)
      const result = `Localizable.${key}`
      console.log(`Replace ${match} to ${result}`)
      return result
    })
  // Add #import "Localizable.h" if needed
  if (newText != text && !newText.includes(`#import "Localizable.h"`)) {
    let matches = Array.from(newText.matchAll(/^#import .+$/gm))
    let lastMatch = matches[matches.length - 1]
    newText = insertAt(
      newText,
      `\n#import "Localizable.h"`,
      lastMatch.index + lastMatch[0].length
    )
  }
  if (!isDryRun) {
    await fs.writeFile(file, newText, "utf-8")
  }
}
