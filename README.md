# migrate-swiftgen-l10n

Replace `NSLocalizedString("foobar.buzz")` to `L10n.FooBar.buzz`

## Usage

```sh
npx migrate-swiftgen-l10n path/to/source/dir
```

## Option

### --dry-run

Use the --dry-run option to see what is replaced without changing the file.

```sh
npx migrate-swiftgen-l10n path/to/source/dir --dry-run
```
