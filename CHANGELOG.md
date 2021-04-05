# Changelog

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