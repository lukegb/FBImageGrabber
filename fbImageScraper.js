// jQuerify, then run this via Chrome Inspector Console

var URL_SET = [
  "Put your Facebook Album URLs here"
];

var pageImageScraper = function(pageContent) {
  var linkSet = jQuery(pageContent).find("a.uiMediaThumb");
  var thisImageSet = [];
  for (var i = 0; i < linkSet.length; i++) {
    var link = linkSet[i];
    var originalImageHref = jQuery(link).attr("ajaxify");
    // find src=
    var srcBegin = originalImageHref.indexOf('src=') + 4;
    var srcEnd = originalImageHref.indexOf('&',srcBegin);
    originalImageHref = unescape(originalImageHref.substring(srcBegin, srcEnd));
    thisImageSet.push(originalImageHref);
  }
  console.log("Found", thisImageSet.length,"images on this page.");
  return thisImageSet;
};

var removeFbBigPipe = function(ain) {
  return jQuery(ain.childNodes[0].data);//;.substring(4, ain.length - 5);
};

var nameScraper = function(pageContent) {
  return jQuery(pageContent).find("div.fbxPhotoSetPageHeaderByline a:first").text() + ": " + jQuery(pageContent).find("h2.uiHeaderTitle").text();
};

var playEndgame = function(dataToDisplay) {
  var newElem = jQuery("<textarea></textarea>"); // okay, new textarea element
  newElem.css({
    'position': 'fixed',
    'top': '0',
    'left': '0',
    'width': '100%',
    'height': '100%',
    'z-index': 9001,
    'background-color': 'black',
    'color': 'green'
  });
  newElem.attr("class", "lgbPhotoLinks lgbPhoto");
  newElem.text(dataToDisplay);
  newElem.appendTo(jQuery("body"));
  
};

var urlNum = 0;
var imageSet = {};
var pageOutput;
var dataSets = [];
var doneUrls = [];

var pageScraper = function(thisUrl, startUrl) {
  var isRecursive = false;
  if (jQuery.inArray(thisUrl, doneUrls) != -1) { // done before!?!
    console.log("This is a recursive loop. Marking as complete and saying I completed this set.");
    isRecursive = true;
  }
  doneUrls.push(thisUrl);
  if (startUrl == undefined)
    startUrl = thisUrl; // first call
  console.log("Fetching and parsing:", thisUrl);
  if (imageSet[startUrl] == undefined)
    imageSet[startUrl] = [];
  
  jQuery.get(thisUrl, "", function(data) {
    // woo
    // what's on this page?
    var page = jQuery(data);
    var q = 0;
    var photoHeaderSection;
    var photoBodySection;
    for (var i = 0; i < page.length; i++) {
      if (page[i].className == "hidden_elem") {
	if (q == 1)
	  photoHeaderSection = page[i];
	else if (q == 2)
	  photoBodySection = page[i];
	q++;
      }
    }
    photoHeaderSection = removeFbBigPipe(photoHeaderSection);
    photoBodySection = removeFbBigPipe(photoBodySection);
    //console.log(photoHeaderSection);
    //console.log(photoBodySection);
    var mainStage = 0;
    var newUrlIs = false;
    var isEndcap = false;
    if (photoBodySection.length == 2) { // either a before or after
      if (photoBodySection[0].className.indexOf('uiMorePager') == -1) { // NOT photos before pager
	newUrlIs = jQuery(photoBodySection[1]).find("a").attr('href');
      } else {
	mainStage = 1;
	console.log("Endcap page. Finish scraping.");
	isEndcap = true;
      }
    } else if (photoBodySection.length == 3) { // definitely both ;)
      mainStage = 1;
      newUrlIs = jQuery(photoBodySection[2]).find("a").attr('href');
    } else {
      console.log("Endcap page. Finish scraping.");
      isEndcap = true;
    }
    if (!isRecursive) {
      imageSet[startUrl].push(pageImageScraper(photoBodySection[mainStage]));
      if (newUrlIs != false)
	pageScraper(newUrlIs, startUrl);
    } // if it's recursive, we still need the header data
    
    if (isEndcap || isRecursive)
      completedScrapingSingleSet(startUrl, nameScraper(photoHeaderSection) + " (" + startUrl +"; " + new Date() + ")");
    
  }, "html");
};

var photoCounter = function(photoPageSet) {
  var photoCount = 0;
  for (var pageNum = 0; pageNum < photoPageSet.length; pageNum++) {
    photoCount += photoPageSet[pageNum].length;
  }
  return photoCount;
};

var completedScrapingSingleSet = function(initialUrl, sectionHeader) {
  console.log("Finished scraping " + initialUrl + " with header " + sectionHeader + " ("+imageSet[initialUrl].length+" pages, " + photoCounter(imageSet[initialUrl]) + " photos)");
  dataSets.push([sectionHeader, imageSet[initialUrl]]);
  
  urlNum += 1;
  // update the progress bar
  var progressPercent = Math.round(urlNum / URL_SET.length * 100);
  jQuery("#lgbPhotoProgress").attr('value', progressPercent);
  jQuery("#lgbPhotoProgress span").text(progressPercent);
  
  if (urlNum == URL_SET.length)
    allScrapingCompleted();
};

var updatePhotoBuildProgress = function(curPhoto, totPhotos, curAlbum, totAlbums) {
  var photoBoxBit = jQuery("#lgbPhotoBox");
  photoBoxBit.find('h1').text('One moment please, creating final output ('+curAlbum+'/'+totAlbums+'):');
  photoBoxBit.find('#lgbPhotoProgress').attr('max', totPhotos);
  photoBoxBit.find('#lgbPhotoProgress').attr('value', curPhoto);
  
  // percent
  photoBoxBit.find('#lgbPhotoProgress span').text(Math.round(curPhoto / totPhotos * 100));
};

var allScrapingCompleted = function() {
  jQuery(".lgbPhoto").remove(); // remove the progress bar, etc.
  var outData = "";
  var totalPhotos = 0;
  for (var albumCount = 0; albumCount < dataSets.length; albumCount++) {
    totalPhotos += photoCounter(dataSets[albumCount]);
  }
  var currentPhoto = 0;
  
  for (var albumCount = 0; albumCount < dataSets.length; albumCount++) {
    var thisAlbum = dataSets[albumCount];
    var albumName = thisAlbum[0];
    var fullList = thisAlbum[1];
    
    outData += albumName + "\n===\n";
    for (var i = 0; i < fullList.length; i++) {
      for (var q = 0; q < fullList[i].length; q++) {
	outData += fullList[i][q] + "\n";
	currentPhoto += 1;
	updatePhotoBuildProgress(currentPhoto, totalPhotos, albumCount, dataSets.length);
      }
    }
    outData += "---\n";
  }
  
  playEndgame(outData);
};

var runScraper = function() {
  jQuery(".lgbPhoto").remove();
  var progressBox = jQuery("<div id='lgbPhotoBox' class='lgbPhoto'><h1>One moment please, your photo URLs are being collected:</h1><br /><progress id='lgbPhotoProgress' class='lgbPhoto' max=100 value=0><span>0</span>%</progress></div>");
  progressBox.css({
    'top': '120px',
    'position': 'fixed',
    'left': '50%',
    'width': '640px',
    'margin-left': '-320px',
    'background-color': 'black',
    'color': 'green',
    'border': '5px solid grey'
  });
  progressBox.find('progress').css({'width': '100%', 'height': '30px'});
  progressBox.find('h1').css({'font-size': 'x-large', 'font-weight': 'bold', 'text-align': 'center'});
  progressBox.appendTo(document.body);
  progressBox.fadeIn();
  
  for (var i = 0; i < URL_SET.length; i++)
    pageScraper(URL_SET[i]);
};

runScraper();
