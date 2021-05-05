# Changelog

## v0.0.8 (2021-05-04)

__Implemented enhancements:__

- Refactored _isCompatibleVer() function to avoid using costly forEach loops.

##### Fixed bugs:

- Changed validator alias on shapeOf.string.asIPv4 to shapeOf.string.ofIPv4, since the 'as' prefix is intended for mutators.
- Changed validator alias on shapeOf.string.asIPv6 to shapeOf.string.ofIPv6, since the 'as' prefix is intended for mutators.
- Changed validator alias on shapeOf.string.asEmail to shapeOf.string.ofEmail, since the 'as' prefix is intended for mutators.
- Added the alias `shapeOf().is()`, which is equivalent to `shapeOf.shouldBe()`.
- Added the alias `shapeOf().isExactly()`, which is equivalent to `shapeOf.shouldBeExactly()`.

## v0.0.7 (2021-04-04)

__Implemented enhancements:__
- Added changelog.
- Added the following validators:
    - shapeOf.string.email, shapeOf.string.asEmail
    - shapeOf.string.ipv4, shapeOf.string.IPv4, shapeOf.string.asIPv4
    - shapeOf.string.ipv6, shapeOf.string.IPv6, shapeOf.string.asIPv6
    - shapeOf.eachOf

__Fixed bugs:__
- Fixed an issue with serialization and regular expressions
- Fixed an issue with sub-validators receiving incorrect arguments for parent validators that require an argument