#E-standards Accessible HTML5 Media Player
==========================================

This is version 2 of this player. Please refer to https://github.com/vet-estandards/accessible-html5-video-player for version 1 attributes.

The National Vocational Education and Training (VET) E-learning Strategy’s New Generation Technologies project manages the E-standards for Training - a set of technical standards recommended for use in the VET sector. (More info at http://e-standards.flexiblelearning.net.au)

Kangan Institute received funding for an "Emerging Technology Trial" in 2013, which eventually resulted in this E-standards for Training Accessible HTML5 Media Player.

This version has the following additional attributes:

* A high contrast focus indicator has been added to the closed caption appearance settings interface.
* Video published on YouTube can be streamed through the player, removing the requirement for video hosting. Initially it was hoped that support for Vimeo could also be added, but the API is not complete so that feature had to be abandoned for the present.
* Code libraries were updated to current versions (as at October 2014).
* The player now accepts MP3 files, so can be used as an accessible audio player. Closed caption files (.vtt) are still supported.
* There is now support for multiple closed caption tracks, allowing for alternative languages. All code was updated to reflect this change, so that changing the language also controls the language of the printed transcript.
* A bug in the Flash fall back resulted in the full screen control being removed from the Flash controls. Flash is required for video running locally and in certain older browsers.

## License 

The player is distributed under the following license:
© Commonwealth of Australia 2013, Licensed under [Creative Commons Attribution-ShareAlike 3.0 Australia License] (https://creativecommons.org/licenses/by-sa/3.0/au/legalcode). 

Original author: Sean Norrey of Kangan Institute

## Demo

[Demonstration page] (http://e-standards.flexiblelearning.net.au/video/media-player-v2/index.htm)
