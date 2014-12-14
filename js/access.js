var vids = []
var currentAccessPlayer = ""
var YouTubesCreated = 0
var playerID = []
var numYouTubesOnPage = 0
//var p=0

$(function() {
		if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)==false ) {
			$(".accessPlayer").each(function(i){
				vids[i] = accessPlayer({apContainer:$(this)})
			})
		}else{
			$("video").attr("controls","controls")
			$("video").attr("poster","")
			document.addEventListener("close", function(){$("video").get(0).pause()})
		}
})

function accessPlayer(setup){
	var browser = whichBrowser()

	var AP = {
		audioTrack:(setup.apContainer.find('audio').length == 1)?  true:  false,
		apObject:setup.apContainer.find("video").get(0),  //setup.vObj,
		apContainer: setup.apContainer,
		audioObject:(setup.apContainer.find('audio').length == 1)?  setup.apContainer.find('audio').get(0):  false,
		dialogOpen:false,
		subtitlesStartPosition:"",
		isYouTube:"",
		YouTubePlayer:"",
		subsPath:[],
		subTitles:[],
		subs_and_timing:new Array(),
		accessPlayerType:"video",
		HTML5TrackTags:new Array(),
		sliderInitialised:false,	
		timedInterval:null,
		selectedLanguage:0,
		YouTubePlayerState:-1,
		playerState:0,
		runOnce:0,
			
		CheckPlayerAndVideoType:function(){
			
			//some video embeds delete the video container and therefore the link to the subtitle file. AP.getSubs() makes sure all subs are stored before that happens.
			AP.getSubs()
			
			if(AP.apContainer.children(":first").prop("tagName") == "AUDIO"){
				AP.createAudioPlayer()
			}else if(AP.apContainer.find("source").attr("type")=="video/youtube"){
				AP.apContainer.find("track").each(function(){
					AP.HTML5TrackTags.push({"label":$(this).attr("label"), "text":$(this).attr("label")})
				})
				AP.isYouTube = true
				AP.injectYouTube()
				numYouTubesOnPage++
			}else{
				try
				{	
					AP.apObject.addEventListener('loadedmetadata', function() {//HTML5 enabled browsers
						AP.init()
					})
				}
				catch(err)
				{
					//IE 6,7,8 don't recognise the loadedmetadata event or HTML5 - it loads the Flash version.
					AP.goFlash()
				}
			}
			AP.apContainer.find("track").each(function(){
				AP.HTML5TrackTags.push({"label":$(this).attr("label"), "text":$(this).attr("label")})
			})
		}, //CheckPlayerAndVideoType
	
		init:function(){
			
			if(AP.subsPath.length==0){
				AP.parseXMLdata()
			}else{
				for(var i = 0; i<AP.subsPath.length; i++){
					AP.parseXMLdata(AP.subsPath[i])
				}
			}
	
			$(AP.apContainer).on("click mouseover", function(){
				currentAccessPlayer = AP
			})
			
			document.addEventListener('close', function(){AP.pauseVid()})
			
		}, //init()
		
		parseXMLdata:function(subs){
			return $.ajax({
					type: "GET",
					url: subs,
					//dataType: "html",
					success: function(xml){
						//When running the local version of the site Firefox will get to this point in the code and Flash/HTML will not initialise. Below is a workaround.
						//If the xml document does not have content and returns [object XMLDocument] put the Flash version on the page.
						if(xml=="[object XMLDocument]"){
							AP.goFlash()
						}else{
							//Page is running on a server and is HTML5 enabled.
							if(browser=="msie"){
								var o = $(AP.apObject).parent()
								$(AP.apObject).css({"zoom":"1","height": o.css("height"),"width": o.css("width")})
							}
							if(subs){
								AP.subTitles.push(xml)
								if(AP.subTitles.length == AP.subsPath.length){
									AP.HTML5appWithSubtitles(AP.subTitles)
								}
							}else{
								AP.HTML5appWithOUTSubtitles()
							}
						}
						
					  },
					  error: function() {
						  //If the browser is HTML5 enabled but page is running locally show the Flash version so captions can still be displayed.
						  switch(window.location.protocol) {
						   case 'http:':
						   case 'https:':
							 AP.HTML5appWithOUTSubtitles()
							 alert("The subtitle file cannot be found.")
							 break;
						   case 'file:':
							  AP.goFlash()
							 break;
						   default: 
							 //some other protocol
						}
					}
				});
		}, //parseXMLdata
		
		HTML5appWithSubtitles:function(){
			AP.DoSubs(AP.subTitles[0], "subtitles")
			AP.setupControls()
			AP.setupSeeking()
			AP.CreateCaptionSettings(AP.apContainer)								
			AP.attachEvents()
			AP.setupFullscreen()
			AP.setupAudioPlayerControls()
		},//HTML5appWithSubtitles
		
		HTML5appWithOUTSubtitles:function(){
			AP.setupControls()
			AP.setupSeeking()
			AP.attachEvents()
			AP.setupFullscreen()
			AP.apContainer.find(".ShowCaptions").css("display","none")
			AP.apContainer.find(".ShowSettings").css("display","none")
		},//HTML5appWithSubtitles
		
		getSubs:function(){
			AP.apContainer.find("track").each(function(i){
				AP.subsPath.push(AP.apContainer.find("track").eq(i).attr("src"))
			})
			
		},//getSubs
		
		DoSubs:function (trContent, trType){
		//default type = subtitles.
		AP.subs_and_timing = new Array()
		var patternID = /^([0-9]+)$/; 			
		if(trType == 'chapters'){patternID = /^chapter-([0-9])+$/; }
		
		var TCpatt = /^([0-9]{2}:[0-9]{2}:[0-9]{2}[,.]{1}[0-9]{3}) --\> ([0-9]{2}:[0-9]{2}:[0-9]{2}[,.]{1}[0-9]{3})(.*)$/;
		var sub_line = trContent.split(/\r?\n/);
		
		for(i = 0; i<sub_line.length; i++) {
			identifier = patternID.exec(sub_line[i])
			i++;
			var TC = TCpatt.exec(sub_line[i])
			if(TC && i<sub_line.length){
				i++;
				var text = sub_line[i];
				i++;
				while(sub_line[i] != '' && i<sub_line.length){
					text = text + '<br />' + sub_line[i];
					i++;						
				}							
				AP.subs_and_timing.push({
					'start': AP.convertSec(TC[1]),
					'stop': AP.convertSec(TC[2]),
					'text': text
				});
			}
		}
		
		transcript = ""
		AP.createTranscript()	
	}, //DoSubs
	
	createTranscript:function(){
		var SAT = AP.subs_and_timing
		AP.apContainer.find(".transcript").remove()
		AP.apContainer.prepend("<div class='transcript'><p><strong>Video transcript:</strong></p></div>")
		var transContainer = AP.apContainer.find(".transcript")
		
		transContainer.append("<p>")
		for (var t=0; t<SAT.length; t++){
			AP.apContainer.find(".imagesForTranscript").find("span").each(function(){
				if(SAT[t+1]){
					if(parseInt($(this).text()) < parseInt(SAT[t+1].start)){
						$(this).find("img").appendTo(transContainer)
					}
				}
			})
			transContainer.append(SAT[t].text + " ")
			if(SAT[t].text.indexOf(".") > 0 || SAT[t].text.indexOf("!") > 0 || SAT[t].text.indexOf("?") > 0){
				transContainer.append("<p>")					
			}
		}
		transContainer.append("<p><strong>End video transcript.</strong></p>")
	},//createTranscript
	
	
	showSubtitles :function(){	
		
		var curTime
			
		(AP.isYouTube)? curTime = AP.YouTubePlayer.getCurrentTime(): curTime = AP.apObject.currentTime
		
		for(var i = 0; i < AP.subs_and_timing.length; i++){		
			if(curTime >= AP.subs_and_timing[i].start && curTime <= AP.subs_and_timing[i].stop){
				break
			}
		}
	
		if(i > AP.subs_and_timing.length-1 ){
			AP.apContainer.find(".SubtitleText").html("<p>-</p>")
		}else if(curTime >=AP.subs_and_timing[i].start && curTime <= AP.subs_and_timing[i].stop){
			AP.apContainer.find(".SubtitleText").html(AP.subs_and_timing[i].text ) 
		}
	
	}, //showSubtitles
	
	attachEvents:function(){
		document.addEventListener("focus", function(event) {
			if (AP.dialogOpen && !AP.apContainer.get(0).contains(event.target)) {
				event.stopPropagation();
				if(AP.isYouTube){
					AP.apContainer.focus()
				}else{
					AP.apContainer.find("video").focus();
				}
			}							
		}, true);
			
		document.addEventListener("keyup", function(event) {
			if (AP.dialogOpen && event.keyCode == 27) {
				AP.dialogOpen = false
			}
		}, true);
	
		AP.apContainer.on("click", function(){window.activeVideo = AP.apContainer;})
		AP.apContainer.on("keypress", function(e){if(e.which == 112){AP.playPauseVid()}})
		AP.apContainer.find("video").on("click", function(){AP.playPauseVid()}).on("keypress", function(e){
			if(e.which == 112 || e.which == 13){AP.playPauseVid()}
			if(e.which == 45){AP.volVidDown()}
			if(e.which == 43 || e.which == 61){AP.volVidUp()}
		}).on("keydown", function(e){
			if(e.which == 37){AP.pauseVid(); AP.stepBackwardVid();}
			if(e.which == 39){AP.pauseVid(); AP.stepForwardVid()}	
		}).on("keyup", function(e){
			if(e.which == 37){AP.playVid();}
			if(e.which == 39){AP.playVid();}
		})
	}, //attachEvents
		
	setupFullscreen:function(){
		if(browser!="opera" && browser!="msie"){
			AP.apContainer.toggle($(document).fullScreen() != null);
			$(document).bind("fullscreenchange", function(e){
					//Show video height and width at 100% 
					AP.apContainer.toggleClass("FullScreen")
					//Reposition the video controls.
					AP.apContainer.find(".vidControls").toggleClass("positionControlsFullScreen")		 
					AP.apContainer.find(".SubtitleContainer").toggleClass("positionSubtitlesFullScreen")
					AP.apContainer.find(".vidFullscreen").toggleClass("minimiseScreen")
			});
		}	
	}, //setupFullscreen
		 
	 setupSeeking:function(){
			
			AP.apContainer.find( ".slider" ).slider({
					max:(AP.isYouTube)?AP.YouTubePlayer.getDuration():AP.apObject.duration,
					min:0,
					create: AP.sliderInitialised = true
				});
			
			AP.apContainer.find(".slider").addClass("ui-slider-background-colour")
			
			AP.apContainer.find(".slider").on("mousedown", function(){
				if(AP.isYouTube){
					AP.YouTubePlayer.seekTo(AP.apContainer.find(".slider").slider('value'), false)
				}
				AP.pauseVid()}
			).on("mouseup", function(){
				(AP.isYouTube)?	AP.YouTubePlayer.seekTo(AP.apContainer.find(".slider").slider('value'), true) : AP.apObject.currentTime = AP.apContainer.find(".slider").slider('value');
				AP.playVid()
			}).on("keydown", function(event){
				if(AP.isYouTube){
					if( event.which==37||event.which==39){
						if(AP.runOnce == false){
							if(AP.YouTubePlayer.getPlayerState() == 1 /*playing*/){
								AP.playerState = 1
							}else{
								AP.playerState = 0
							}
							AP.runOnce = true
						}
						AP.pauseVid()
					}
				}else{
					if( event.which==37||event.which==39){
						AP.pauseVid()
					}
				}
				AP.processKeyUpEvents(event.which, AP.apObject)						
				//this lets the screen reader know to process the object differently, otherwise the link on the anchor tag is read out.
				$(this).find("a").attr("role","slider")
				$(this).find("a").attr("aria-label","Label Scrub bar position is at " +AP.apObject.currentTime+" seconds.")
				//This is triggered by the mouse only, not the keyboard
				$(this).find("a").attr("aria-valuetext","value text Scrub bar position is at " +AP.apObject.currentTime+" seconds.")
				if(event.which==32){
					event.preventDefault();
				}
			}).on("keyup",function(event){
				AP.runOnce = false
				//if(AP.isYouTube){
					if(event.which == 37 || event.which == 39){
						if(AP.playerState == 1){
							AP.playVid()
							AP.playerState = 1
						}
					}
				//}
			})
			//set the initial volume of the video and audio description
			AP.apObject.volume = .7
			AP.volAudioVideoMatch()  
			
			
			
	 }, //setupSeeking
			
	setupControls:function(){
		if(AP.apContainer.find(".vidControls").length < 1){
			AP.apContainer.append("<div class='vidControls'>\
				<button class='vidPlayPause' aria-controls='vidControls'>Play</button>\
				<button class='vidStop' aria-controls='vidControls'>Stop</button>\
				<button class='vidStepBackward' aria-controls='vidControls'>Step Backward</button>\
				<button class='vidStepForward' aria-controls='vidControls'>Step Forward</button>\
				<div class='slider' role='slider' aria-valuemin='0' aria-valuemax='100' aria-valuenow='0' aria-valuetext='0 minutes and 0 seconds' title='Video seek'></div>\
				<button class='vidVolDown' aria-controls='vidControls'>Volume down</button>\
				<button class='vidVolUp' aria-controls='vidControls'>Volume up</button>")
			
				//Opera and IE don't support fullscreen so the fullscreen button is not shown
				if(browser!="opera" && browser!="msie" && browser!="safari"){AP.apContainer.find(".vidControls").append("<button class='vidFullscreen' aria-controls='vidControls'>Fullscreen</button>")}
				
				AP.apContainer.find(".vidControls").append("<button class='ShowCaptions' aria-controls='vidControls'>Captions</button>\
					<button class='ShowSettings' aria-controls='vidControls'>Caption Settings</button>")
								
				//Show the audioDescription button if there is an audio track
				if(AP.audioTrack){AP.apContainer.find(".vidControls").append("<button class='AudioDescriptionTrack' aria-controls='vidControls'>Audio Description</button>")}
				
				AP.apContainer.find(".vidControls").append("</div>")
				AP.apContainer.find(".vidPlayBut").on("click", function(){AP.playVid()})
				AP.apContainer.find(".vidPlayPause").on("click", function(){AP.playPauseVid()})
				AP.apContainer.find(".vidPause").on("click", function(){AP.pauseVid()})
				AP.apContainer.find(".vidStop").on("click", function(){AP.stopVid()})
				AP.apContainer.find(".vidStepForward").on("click", function(){AP.stepForwardVid()})
				AP.apContainer.find(".vidStepBackward").on("click", function(){AP.stepBackwardVid()})
				AP.apContainer.find(".vidVolDown").on("click", function(){AP.volVidDown() })           
				AP.apContainer.find(".vidVolUp").on("click", function(){AP.volVidUp()})
				AP.apContainer.find(".vidFullscreen").on("click", function(){AP.Fullscreen()})
				AP.apContainer.find(".ShowCaptions").on("click", function(){AP.showCaptions()})
				AP.apContainer.find(".ShowSettings").on("click", function(){AP.showSettings()})
				AP.apContainer.find(".AudioDescriptionTrack").on("click", function(){AP.AudioDescription()})	
			}						
	}, //setupControls
	
	playVid:function(){
		 AP.controlYouTube("play")
		 AP.stopTimer()
		 AP.apObject.play()
		 AP.audioPlay()
		 AP.startTimer()
		 AP.setPlayPauseVal("Pause")
		 AP.switchPlayPauseImage("Pause")
	}, //end playVid
	
	 pauseVid:function(){	
		AP.controlYouTube("pause")
		AP.stopTimer()
		AP.audioStop()
		AP.apObject.pause()
		AP.setPlayPauseVal("Play")
		AP.switchPlayPauseImage("Play")
	}, //end pauseVid
			
	 playPauseVid:function(){
		if(AP.apObject.paused){		   
			AP.audioPlay()
			AP.playVid()
			AP.switchPlayPauseImage("Pause")
		}else{
			AP.audioStop()
			AP.pauseVid()	
			AP.switchPlayPauseImage("Play")
		}
	 }, //playPauseVid
	
	stopVid:function(){	
		AP.stopTimer()
		AP.apObject.pause()
		AP.setCurrentTime(0)
		AP.showTime()
		AP.setPlayPauseVal("Play")
		AP.switchPlayPauseImage("Play")
		AP.audioStop()
	}, //stopVid
	
	stepForwardVid:function (){
		AP.controlYouTube("jogForward")
		AP.apObject.currentTime +=3
		setTimeout(function(){AP.syncTracks()},1000)
		AP.showTime()	
	}, //stepForwardVid
	
	stepBackwardVid:function (){
		AP.controlYouTube("jogBackward")
		AP.apObject.currentTime -=3
		setTimeout(function(){AP.syncTracks()},1000)
		AP.showTime()
	}, //stepBackwardVid
	
	volVidUp:function(){
		AP.controlYouTube("volUp")
		try{AP.apObject.volume += .1}
		catch(err){AP.apObject.volume = 1}
		AP.volAudioVideoMatch()  
	},//volVidUp
	
	volVidDown:function(){
		AP.controlYouTube("volDown")
		try{AP.apObject.volume -= .1}
		catch(err){AP.apObject.volume = 0}
		AP.volAudioVideoMatch()  
	}, //volVidDown
	
	volAudioVideoMatch:function(){
		AP.audioObject.volume = AP.apObject.volume
	},//volAudioVideoMatch
	
	showTime:function (){ 
		/* To show time use this method: $("#textdisplayobject").text(AP.formatTime(AP.apObject.currentTime))*/
		 AP.updateProgressBar()
		 AP.showSubtitles()
	}, //showTime
	
	updateProgressBar:function(){		  
		 if(AP.sliderInitialised){
			 if(AP.isYouTube){
				 AP.apContainer.find( ".slider" ).slider( "option", "value",AP.YouTubePlayer.getCurrentTime())
			}else{			 
				AP.apContainer.find( ".slider" ).slider( "option", "value", AP.apObject.currentTime );
			}
		 }
	},//updateProgressBar
	
	setPlayPauseVal:function(val){
		  AP.apContainer.find(".vidPlayPause").text(val)
		  AP.apContainer.find(".vidPlayPause").attr("title",val)
	}, //setPlayPauseVal
	
	startTimer:function(){
		 AP.timedInterval= window.setInterval(function(){AP.showTime()},100)
	}, //startTimer
	
	stopTimer:function(){
		  AP.timedInterval= window.clearInterval(AP.timedInterval)
	}, //stopTimer
	
	setCurrentTime:function (T){
		  AP.apObject.currentTime = T
	}, //setCurrentTime
	
	formatTime:function (sec) { 
		var mini = Math.floor(sec/60);        
		sec -= mini*60;        
		if (sec<10){ 
			var sec_str = "0" + Math.round(sec); 
		}else{ 
			sec_str = Math.round(sec);
		}
		if (mini<10){
			var min_str= "0" + Math.round(mini); 
		}else{
			min_str = Math.round(mini);
		}
		var time = min_str + ":" + sec_str;        
		return time;
	}, //formatTime
	
	Fullscreen:function(){
		if($(document).fullScreen()==false){
			AP.dialogOpen = true
			$(AP.apContainer).fullScreen(true)
		}else{
			AP.dialogOpen = false
			$(AP.apContainer).fullScreen(false)
			//return the subtitles to the original position - saves them flying off the screen.
			AP.apContainer.find(".SubtitleContainer").css("top",AP.subtitlesStartPosition[0])
			AP.apContainer.find(".SubtitleContainer").css("left", AP.subtitlesStartPosition[1])
		}
	}, //Fullscreen
	
	processKeyUpEvents:function(key, vidObj){
		//function works specifically on the scrub bar slider.
		if(key==39 || key==37){
			if(AP.isYouTube){
				 //AP.pauseVid()
				 AP.YouTubePlayer.seekTo(AP.apContainer.find(".slider").slider('value'), true)
			}else{
				 AP.apObject.currentTime = AP.apContainer.find(".slider").slider('value');
			}
		}
		if(key==32 || key==13){
			AP.playPauseVid()
		}
	},// processKeyUpEvents
	
	AudioDescription:function(){
		if(AP.enableSecondAudioTrack){
			AP.audioStop()
			AP.enableSecondAudioTrack = false
			AP.apContainer.find(".AudioDescriptionTrack").removeClass("buttonHighlightColour")
		}else{
			AP.enableSecondAudioTrack = true
			AP.audioPlay()
			AP.apContainer.find(".AudioDescriptionTrack").addClass("buttonHighlightColour")
		}
	},//AudioDescription
	
	enableSecondAudioTrack:false,
	
	audioPlay:function(){
		if(AP.audioTrack && AP.enableSecondAudioTrack && !AP.apObject.paused ){
			setTimeout(function(){AP.syncTracks()},100)
			AP.audioObject.play()
		}
	}, //audioPlay
	
	audioStop:function(){
		if(AP.audioTrack && AP.enableSecondAudioTrack){
			setTimeout(function(){AP.syncTracks()},100)
			AP.audioObject.pause()
		}
	}, //audioStop
	
	SwitchSubs:function(ind){
		AP.selectedLanguage = ind
		AP.DoSubs(AP.subTitles[ind], "subtitles")
	},//SwitchSubs
	
	syncTracks:function(){
		console.log("sync")
		if(AP.isYouTube){
			AP.audioObject.currentTime = AP.YouTubePlayer.getCurrentTime()
		}else{
			AP.audioObject.currentTime = AP.apObject.currentTime;
		}
	},//syncTracks
	
	CreateCaptionSettings:function(attachTo, textField){
		AP.createSubtitleContainer(attachTo)
		AP.subtitlesStartPosition = [AP.apContainer.find(".SubtitleContainer").css("top"), AP.apContainer.find(".SubtitleContainer").css("left")]
		if($("body #CaptionSettings").length==0){
			$("body").append("<div id='CaptionSettings' />")	
			$("#CaptionSettings").prepend("<div class='ColourSelector'>Foreground</div>")
			AP.addCaptionSettings($("#CaptionSettings"))
			AP.createColourPickers()
			AP.createTransparencySettings()
			AP.createFontSelector()
			AP.createSubtitleExample($("#CaptionSettings"))
			AP.showAccessibleBorders($("#CaptionSettings"))
		}
	}, //CreateCaptionSettings
	
	showAccessibleBorders:function(obj){
		obj.find('*').on("focus", function(){
			$(this).addClass("accessibleBorder")
		}).on("blur", function(){
			$(this).removeClass("accessibleBorder")
		})
	}, //showAccessibleBorders
	
	addCaptionSettings:function(attachTo){	
		attachTo.append("<div class='TransparencySettings'>"+
			   " Background opacity: "+
			   " <input id='ZeroPercent' type='radio' name='Opacity' value='0 percent'><label for='ZeroPercent'>0%</label>"+
			   " <input id='TwentyFivePercent' type='radio' name='Opacity' value='25 percent'><label for='TwentyFivePercent'>25%</label>"+
			   " <input id='FiftyPercent' type='radio' name='Opacity' value='50 percent'><label for='FiftyPercent'>50%</label>"+
			   " <input id='SeventyFivePercent' type='radio' name='Opacity' value='75 percent' checked><label for='SeventyFivePercent'>75%</label>"+
			   " <input id='OneHundredPercent' type='radio' name='Opacity' value='100 percent'><label for='OneHundredPercent'>100%</label>"+
		   " </div>"+
		   " <div class='FontType'>"+
			"    <label for='ChooseFont'>Font:</label>"+
			"    <select id='ChooseFont'>"+
			"      <option value='Arial'>Arial</option>"+
			"      <option value='Century Gothic'>Century Gothic</option>"+
			"      <option value='Georgia'>Georgia</option>"+
			"      <option value='Times New Roman'>Times New Roman</option>"+
			"      <option value='Verdana'>Verdana</option>"+
			 "   </select>    "+
			"</div>"+
		   " <div class='FontSize'>"+
		   " Size:   <button class='IncreaseFontSize' title='Increase Font Size'>+</button>"+
		   "         <button class='DecreaseFontSize' title='Decrease Font Size'>-</button>"+
		   " </div>")
		$("#CaptionSettings").find(".IncreaseFontSize").on("click", function(){AP.IncreaseFontSize()})
		$("#CaptionSettings").find(".DecreaseFontSize").on("click", function(){AP.DecreaseFontSize()})
	}, //addCaptionSettings
	
	createColourPickers:function(){
		for(var i=0; i< AP.getColour().length; i++){
			$("#CaptionSettings").find(".ColourSelector").append("<button class='picker' tabindex='0' title='"+'Foreground ' + AP.getColour()[i]+"'></button>")
		}
		$(".ColourSelector").append("<br/><br/>Background")
		for(var i=0; i< AP.getColour().length; i++){
			$("#CaptionSettings").find(".ColourSelector").append("<button class='pickerBG' tabindex='0' title='"+'Background ' + AP.getColour()[i]+"'></button>")
		}
		
		$(".picker").each(function(i){
			//set the colour of every picker
			$(this).css("background-color", AP.getColour()[i])
				$(this).on('click', function(){		
					AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"),$("#CaptionSettings").find(".SubtitleTextEx"), "color", $(this).css("background-color"))
				}).on('keydown', function(e){
					if (e.which == 32) {
						AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"),$("#CaptionSettings").find(".SubtitleTextEx"), "color", $(this).css("background-color"))
					  }  
				})
			})
			
		$(".pickerBG").each(function(i){
			//set the colour of every picker
			$(this).css("background-color", AP.getColour()[i])
			$(this).on('click', function(){	
					AP.setSubtitleStyle(window.activeVideo.find(".SubtitleTextBG"),$("#CaptionSettings").find(".SubtitleTextBGEx"), "background-color", $(this).css("background-color"))
				}).on('keydown', function(e){
					if(e.which == 32) {
						AP.setSubtitleStyle(window.activeVideo.find(".SubtitleTextBG"),$("#CaptionSettings").find(".SubtitleTextBGEx"), "background-color", $(this).css("background-color"))
				  }  
			})
		})
		
		$("#CaptionSettings").find(".ColourSelector").append("<br/><br/>Colour")
		$("#CaptionSettings").find(".ColourSelector").append("<button class='pickerSetBlackWhite' tabindex='0'>Black White</button>")
		$("#CaptionSettings").find(".ColourSelector").append("<button class='pickerSetWhiteBlack' tabindex='0'>White Black</button>")
		$("#CaptionSettings").find(".ColourSelector").append("<button class='pickerSetBlackYellow' tabindex='0'>Black Yellow</button>")
		$("#CaptionSettings").find(".ColourSelector").append("<button class='pickerSetBlueWhite' tabindex='0'>Blue White</button>")
		
		$("#CaptionSettings").find(".pickerSetBlackWhite, .pickerSetWhiteBlack, .pickerSetBlackYellow, .pickerSetBlueWhite ").on("click", function(){
			AP.setSubtitleStyle(window.activeVideo.find(".SubtitleTextBG"),$("#CaptionSettings").find(".SubtitleTextBGEx"), "background-color",	$(this).css("background-color"))
			AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"), $("#CaptionSettings").find(".SubtitleTextEx"), "color",	$(this).css("color"))
		}).on('keydown', function(e){
			if (e.which == 32) {
				AP.setSubtitleStyle(AP.apContainer.find(".SubtitleTextBG"),$("#CaptionSettings").find(".SubtitleTextBGEx"), "background-color",	$(this).css("background-color"))
				AP.setSubtitleStyle(AP.apContainer.find(".SubtitleText"),$("#CaptionSettings").find(".SubtitleTextEx"), "color",	$(this).css("color"))
			 }  
		})
	}, //createColourPickers
	
	IncreaseFontSize:function(){
		var currentFontSize = parseInt(window.activeVideo.find(".SubtitleText").css("font-size"))
		currentFontSize+=2
		AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"),$("#CaptionSettings").find(".SubtitleTextEx"), "font-size", currentFontSize)
	},//IncreaseFontSize
	
	DecreaseFontSize:function(){
		var currentFontSize = parseInt(window.activeVideo.find(".SubtitleText").css("font-size"))
		if(currentFontSize >10){
			currentFontSize-=2
			AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"),$("#CaptionSettings").find(".SubtitleTextEx"), "font-size", currentFontSize)
		}
	}, //DecreaseFontSize
	
	getColour:function(i){
		return ["White","Black","Red","Yellow","Lime","Aqua","Blue","Fuchsia"]
	}, //getColour
	
	showSettings:function(){
		 var wasFullscreen
		 if($(document).fullScreen()){
			 wasFullscreen = true
			 $(document).fullScreen(false)
		}
		function checkFS(){
			if(wasFullscreen == true){						
				$(AP.apContainer).fullScreen(true)
				wasFullscreen = false
			}		
		}
		$("#CaptionSettings").dialog({
			modal: true,
			buttons: {
				Ok: function() {
					$(this).dialog( "close" );
					checkFS()
					$("#CaptionSettings .SelectLanguage").remove()
				}				
			},
			"close":function(){
				checkFS()
				$("#CaptionSettings .SelectLanguage").remove()
			},
			"title":"Caption settings",
			"width":440,
			"height":470,
			"min-height":360,
			"position":"center"
		})	
		
		//This creates a subtitle track selector. As the SAME caption settings dialog box is used for all video and audio players the language select box is created and destroyed .remove() when needed.
		if(AP.HTML5TrackTags.length>1){
			$("#CaptionSettings .FontSize").after("<div class='SelectLanguage'><p>Select language: <select class='SwitchSubs'></select></p>")
			for(var i=0;i<AP.HTML5TrackTags.length;i++){	
				$("#CaptionSettings .SelectLanguage select").append($("<option>").attr('value',AP.HTML5TrackTags[i].label).text(AP.HTML5TrackTags[i].text))
			}
		}
		$("#CaptionSettings").find(".SwitchSubs").prop("selectedIndex",AP.selectedLanguage);
		$("#CaptionSettings").find(".SwitchSubs").on("change", function(){AP.SwitchSubs(this.selectedIndex)}).trigger("change")		
	},//showSettings
		
	showCaptions:function(){
		var c = AP.apContainer.find(".SubtitleContainer")
		var b = (c.css("display") == "block")? "none" : "block"
		c.css("display", b)
	}, //showCaptions
	
	createSubtitleContainer:function(){
		AP.apContainer.append("<div class='SubtitleContainer'>"+
			"	<div class='SubtitleTextBG'></div>"+
			"	<div class='SubtitleText'></div>"+
			"</div>")			
			AP.apContainer.find(".SubtitleContainer" ).draggable({ containment: AP.apContainer, scroll: false });
			AP.apContainer.find(".SubtitleContainer" ).resizable();
	}, //createSubtitleContainer
	
	createSubtitleExample:function(attachTo){
		attachTo.append("<div class='SubtitleContainerEx'>"+
		"	<div class='SubtitleTextBGEx'></div>"+
		"	<div class='SubtitleTextEx'><p>Here is some example text.</p></div>"+
		"</div>")
	}, //createSubtitleExample	
	
	createTransparencySettings:function(){
		$("#CaptionSettings").find(".TransparencySettings").find("input").on("click", function(){		
			AP.setSubtitleStyle(window.activeVideo.find(".SubtitleTextBG"), $("#CaptionSettings").find(".SubtitleTextBGEx"), "opacity", parseInt($(this).attr("value"))/100)
		})
	}, //createTransparencySettings
	
	createFontSelector:function(){
		$("#CaptionSettings").find("#ChooseFont").change(function () {
			  $(this).find("option:selected").each(function(){
					AP.setSubtitleStyle(window.activeVideo.find(".SubtitleText"), $("#CaptionSettings").find(".SubtitleTextEx"), "font-family", $(this).text()+", sans-serif")
			   });
		})
	}, //createFontSelector
	
	setSubtitleStyle:function (obj, obj2, CSS1, CSS2){
		obj.css(CSS1,CSS2)
		if(obj2){
			obj2.css(CSS1,CSS2)
		}
	},//setSubtitleStyle
	
	switchPlayPauseImage:function(stateOfPlay){
		(stateOfPlay == "Play")? AP.apContainer.find(".vidPlayPause").removeClass("paused") :  AP.apContainer.find(".vidPlayPause").addClass("paused")
	},//switchPlayPauseImage
	
	
	convertSec:function(TC){
		var t = TC.split(':');
		return t[0]*60*60 + t[1]*60 + parseFloat(t[2].replace(',','.'));
	},//convertSec
	
	videoDetect:function(content){	
		if(browser =="firefox" || browser=="chrome"){				
			AP.apContainer.find("video").each(function(){
				$(this).find("source").attr("src", 	$(this).find("source").attr("src").replace(".mp4", ".webm"))
				$(this).find("source").attr("type", $(this).find("source").attr("type").replace("mp4", "webm"))
			})
		}
		//return content.html()
	},//videoDetect
	
	goFlash:function(){
		var playerSource, vidSource, captionSource, controlsSource, skinColour;
		skinColour = "0x222222"
		$(AP.apContainer).find(".FlashPlayer").each(function(){
			//find the required file location information and strip out the spaces.
			playerSource = $(this).find(".videoPlayerLocation").text().replace(/\s+/g, '');
			controlsSource = $(this).find(".videoPlayerControlsLocation").text().replace(/\s+/g, '');
			captionSource = $(this).find(".videoCaptionsFileLocation").text().replace(/\s+/g, '');
			vidSource = $(this).find(".videoSourceFileLocation").text().replace(/\s+/g, '');
			if($(this).find(".videoControlsColour").text().replace(/\s+/g, '') != ""){
				skinColour =  $(this).find(".videoControlsColour").text().replace(/\s+/g, '').replace("#","0x");
			}
		})
		
		//Must have unique IDs on a HTML page, this should produce enough unique identifiers - but in rare cases could be an issue - refreshing page should fix the problem of same ID.
		var uniqueID = "Video" + parseInt(Math.random() * 10000)
		//Need to create a custom id for the myContent ID.
		$("<div class='accessPlayer'><div id='"+uniqueID+"'></div></div>").insertAfter($(AP.apContainer))
		var params = { allowscriptaccess: 'always', allowfullscreen: true, salign:"t"};
		swfobject.embedSWF(playerSource+"?videoSource="+vidSource+"&Captions="+captionSource+"&videoSkin="+controlsSource+"&SkinColour="+skinColour, uniqueID, parseInt($(".accessPlayer").width()), $(".accessPlayer").height()/*   *1.125*/, "9.0.0", false,false, params);
		//strip out the original video container so HTML5 browsers don't show the HTML5 video and the Flash video.
		$(AP.apContainer).remove()
	}, //goFlash
	
	injectYouTube:function(){
		var uniqueID = "Video" + parseInt(Math.random() * 10000)
		var YouTubeID = AP.apContainer.find("source").attr("src").match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/)[1];
		var flashvars = {}
		var params = {}
		params.allowscriptaccess = "always";
		params.allowfullscreen = "true";
		params.fullscreenselection = "true";
		params.wmode="opaque"
		
		var atts = { id: uniqueID };
		var swoID = AP.apContainer.find("video").attr("id", uniqueID)
		swfobject.embedSWF("http://www.youtube.com/v/"+YouTubeID+"?enablejsapi=1&playerapiid="+uniqueID+"&version=3&controls=0&fs=1&modestbranding=1&rel=0&showinfo=0&color=white&theme=light&cc_load_policy=0",
						   uniqueID, "100%", "100%", "9.0.0", false, flashvars, params, atts);
		
		AP.YouTubePlayer = AP.apContainer.find("object").get(0)
		
		//create overlay to block YouTube click events. This is used to initialise the accessible controls.
		AP.apContainer.prepend("<div class='YouTubeBlock'></div>")
		AP.apContainer.find(".YouTubeBlock").css({
			"position":"absolute",
			"top":0,
			"left":0,
			"width":"100%", 
			"height":"100%",
			"background-image":"url('css/controls/yt-play.png')",
			"background-repeat":"no-repeat",
			"background-position":"center center"
		}).get(0).addEventListener("click", function(){
			AP.playPauseVid();
			$(this).css('display','none')
		})
		
		AP.apContainer.find(".YouTubeBlock").hover(function(){
			$(this).css("background-image","url('css/controls/yt-play-over.png')")
		}, function(){$(this).css("background-image","url('css/controls/yt-play.png')")})
	},//injectYouTube
	
	controlYouTube:function(action){
		 if(AP.isYouTube){
			 switch(action){
				 case "play":
					 AP.YouTubePlayer.playVideo()
					 AP.apContainer.find('.YouTubeBlock').css('display','none')
					 AP.switchPlayPauseImage("pause")
					 break;
				 break;
				 case "pause":
					 AP.YouTubePlayer.pauseVideo()
					 AP.apContainer.find('.YouTubeBlock').css('display','block')
					 AP.switchPlayPauseImage("Play")
					 break;
				 case "volUp":
					 AP.YouTubePlayer.setVolume(AP.YouTubePlayer.getVolume()+10)
					 break;
				 case "volDown":
					 AP.YouTubePlayer.setVolume(AP.YouTubePlayer.getVolume()-10)
					 break;
				case "jogForward":
					 AP.YouTubePlayer.seekTo(AP.YouTubePlayer.getCurrentTime()+3, true)
				break;
				case "jogBackward":
					 AP.YouTubePlayer.seekTo(AP.YouTubePlayer.getCurrentTime()-3, true)
				break;
			 }
		}
	},//controlYouTube
	
	createAudioPlayer:function(){
		AP.accessPlayerType = "audio"
		AP.apObject = AP.apContainer.find("audio").get(0)
		AP.apObject.addEventListener('loadedmetadata', function() {
			AP.init()
		})
	},//createAudioPlayer
	
	setupAudioPlayerControls:function(){
		if(AP.accessPlayerType=="audio"){
			AP.apContainer.find(".vidFullscreen, .AudioDescriptionTrack").css("display", "none")
			AP.apContainer.css("height", 0)
			AP.apContainer.find(".vidControls .ShowCaptions").on("mouseup",function(){
				AP.apContainer.toggleClass("showAudioSubtitles")
				if(AP.apContainer.find(".SubtitleContainer").is(".ui-draggable")){
					AP.apContainer.find(".SubtitleContainer").css({"width":"100%", "left":"0px"}).draggable('destroy').resizable('destroy')
				}
			})
			
			AP.apContainer.find(".vidControls .ShowCaptions").on("keypress", function(e){
				if(e.which == 32 || e.which == 13){
					AP.apContainer.toggleClass("showAudioSubtitles")
					if(AP.apContainer.find(".SubtitleContainer").is(".ui-draggable")){
						AP.apContainer.find(".SubtitleContainer").css({"width":"100%", "left":"0px"}).draggable('destroy').resizable('destroy')
					}
				}
			})
		}
	}//setupAudioPlayerControls
	}//AP
	
	AP.CheckPlayerAndVideoType()
	window.activeVideo = ""
	return AP
}

Array.prototype.clean = function(deleteValue) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == deleteValue) {         
      this.splice(i, 1);
      i--;
    }
  }
  return this;
};

Array.prototype.startAndEndTimes = function(){
	var startTimes = this[0].split(':');
	var endTimes = this[1].split(':');
	var times = new Array()
	times[0] = startTimes[0]*60*60 + startTimes[1]*60 + parseFloat(startTimes[2].replace(',','.'));
	times[1] = endTimes[0]*60*60 + endTimes[1]*60 + parseFloat(endTimes[2].replace(',','.'));
	return times
}

Array.prototype.getTimes = function(){
	var times = []
	var completeTimes = []
	for(i = 0; i<this.length; i++) {
		//look only for the time codes
		if(this[i].indexOf(" --> ") >-1){							
			//split each time pair into the times array			
			times[i] = this[i].split(" --> ")
			completeTimes.push(times[i].startAndEndTimes())
		}
	}
	return completeTimes
}

Array.prototype.getSubtitles = function (){
	var subs = []
	for(i = 0; i<this.length; i++) {
		//ignore the time codes
		if(this[i].indexOf(" --> ") == -1){
			//if it isn't a whole number (which is a line number in .vtt files push it into the array.
			if(this[i].search(/^\s*\d+\s*$/) == -1){
				subs.push(this[i])				
			}
		}
	}	
	return subs
}

function whichBrowser(br){
	var iBrowse
	if(/msie/.test(navigator.userAgent.toLowerCase())){iBrowse = "msie"}
	if(/opera/.test(navigator.userAgent.toLowerCase())){iBrowse = "opera"}
	if(/safari/.test(navigator.userAgent.toLowerCase())){iBrowse = "safari"}
	if(/chrome/.test(navigator.userAgent.toLowerCase())){iBrowse = "chrome"}
	if(/firefox/.test(navigator.userAgent.toLowerCase())){iBrowse = "firefox"}
	return iBrowse
}


function onYouTubePlayerReady(playerId) {
	YouTubesCreated++
	playerID.push(playerId)	
	var k = 0
	if(numYouTubesOnPage==YouTubesCreated){
		for(var i=0; i<vids.length; i++){
			if(vids[i].isYouTube){
		    	document.getElementById(playerID[k]).addEventListener("onStateChange", "playerStateChange")
				vids[i].init()
				k++
			}
		}
	}
}

function playerStateChange(state){
	if(state===1){
		currentAccessPlayer.controlYouTube("play")
	}
	if(state===2){
		currentAccessPlayer.controlYouTube("pause")
	}
}