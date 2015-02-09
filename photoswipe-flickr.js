if (typeof photoswipeFlickr === 'undefined')
{
  photoswipeFlickr = function(apiKey, photosetId, galleryOptions, callback) {
    return photoswipeFlickr._init(apiKey, photosetId, galleryOptions, callback);
  };

  photoswipeFlickr._galleryOptions = undefined;
  photoswipeFlickr._flickrData = undefined;
  photoswipeFlickr._gallery = undefined;

  photoswipeFlickr._flickrPhotoSizes = {
    240: 'm',
    320: 'n',
    640: 'z',
    800: 'c',
    1024: 'b',
    1600: 'h',
    2048: 'k',
    2400: 'o' // do not comment this out.
              // TODO: allow commenting out, but if image doesn't have some of the larger sizes, always default to "original" size
  };
  photoswipeFlickr._currentSize = parseInt(Object.keys(photoswipeFlickr._flickrPhotoSizes)[0], 10); //start with smallest size
  photoswipeFlickr._firstResize = true;


  photoswipeFlickr.xhr = function (type, url, data) {
    var methods = {
      success: function () {},
      error: function () {}
    };

    var parse = function (req) {
      var result;
      if (type === 'JSONP') {
        result = req;
        req = null;
      }
      else {
        try {
          result = JSON.parse(req.responseText);
        } catch (e) {
          result = req.responseText;
        }
      }
      return [result, req];
    };

    var returnObj = {
      success: function (callback) {
        methods.success = callback;
        return returnObj;
      },
      error: function (callback) {
        methods.error = callback;
        return returnObj;
      }
    };

    if (type === 'JSONP') {
      var timestamp = 'callback'+new Date().getTime();
      window[timestamp] = function(request) { methods.success.apply(methods, parse(request)); };
      var script = document.createElement('script');
      script.src = url+'&jsoncallback='+timestamp;
      document.getElementsByTagName('head')[0].appendChild(script);
    }
    else {
      var request = new (XMLHttpRequest || ActiveXObject)('MSXML2.XMLHTTP.3.0');
      request.open(type, url, true);
      request.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
      request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
      request.onreadystatechange = function () {
        if (request.readyState === 4) {
          if (request.status === 200) {
            methods.success.apply(methods, parse(request));
          }
          else {
            methods.error.apply(methods, parse(request));
          }
        }
      };
      request.send(data);
    }

    return returnObj;
  };


  photoswipeFlickr.initGallery = function(callback) {
    callback = callback || function(){};
    if(!photoswipeFlickr._flickrData || !photoswipeFlickr._galleryOptions)
    {
      return 'You have to initialize everything.';
    }

    if (!photoswipeFlickr._gallery)
    {
      photoswipeFlickr._initGallery(photoswipeFlickr._flickrData, photoswipeFlickr._galleryOptions);
    }

    callback(photoswipeFlickr._gallery);
  }


  photoswipeFlickr._initGallery = function (data, galleryOptions) {
    // Initializes and opens PhotoSwipe
    var pswpElement = document.querySelectorAll('.pswp')[0],
        gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, data, galleryOptions);

    // beforeResize event fires each time size of gallery viewport updates
    gallery.listen('beforeResize', function() {
      // gallery.viewportSize.x - width of PhotoSwipe viewport
      // gallery.viewportSize.y - height of PhotoSwipe viewport
      // window.devicePixelRatio - ratio between physical pixels and device independent pixels (Number)
      //                          1 (regular display), 2 (@2x, retina) ...

      var newSize = 0,
          imageSrcWillChange = false
          realViewportWidth = gallery.viewportSize.x * window.devicePixelRatio; // calculate real pixels when size changes


      for (var size in photoswipeFlickr._flickrPhotoSizes)
      {
        if (realViewportWidth > size)
        {
          newSize = parseInt(size, 10);
        }
      }

      if (photoswipeFlickr._currentSize < newSize)
      {
        imageSrcWillChange = true;
        photoswipeFlickr._currentSize = newSize;
      }

      // Invalidate items only when source is changed and when it's not the first update
      if(imageSrcWillChange && !photoswipeFlickr._firstResize)
      {
        // invalidateCurrItems sets a flag on slides that are in DOM, which will force update of content (image) on window.resize.
        gallery.invalidateCurrItems();
      }

      photoswipeFlickr._firstResize = false;
    });


    // gettingData event fires each time PhotoSwipe retrieves image source & size
    gallery.listen('gettingData', function(index, item) {

      // Set image source & size based on real viewport width
      var ext = photoswipeFlickr._flickrPhotoSizes[photoswipeFlickr._currentSize];
      item.src = item.sizeData[ext].src || item['o'].src;
      item.w = item.sizeData[ext].w || item['o'].w;
      item.h = item.sizeData[ext].h || item['o'].h;

      // It doesn't really matter what will you do here, as long as item.src, item.w and item.h have valid values.
      //
      // Just avoid http requests in this listener, as it fires quite often
    });

    gallery.listen('destroy', function() {
      photoswipeFlickr._gallery = undefined;
    });

    photoswipeFlickr._gallery = gallery;
  };




  photoswipeFlickr._init = function(apiKey, photosetId, galleryOptions, callback) {
    var sizes = photoswipeFlickr._flickrPhotoSizes;

    photoswipeFlickr._galleryOptions = galleryOptions || {};

    if (!('getImageURLForShare' in photoswipeFlickr._galleryOptions))
    {
      photoswipeFlickr._galleryOptions.getImageURLForShare = function(shareButtonData) {
        return photoswipeFlickr._gallery.currItem.original_src || photoswipeFlickr._gallery.currItem.src || '';
      };
    }

    // photoswipeFlickr._flickrData = undefined;
    // photoswipeFlickr._gallery = undefined;

    callback = callback || function(){};

    if (photoswipeFlickr._flickrData)
    {
      photoswipeFlickr._initGallery(photoswipeFlickr._flickrData, photoswipeFlickr._galleryOptions);
      callback(photoswipeFlickr._gallery);
    }
    else
    {
      var sizeParams = Object.keys(sizes).map(function(size) { return 'url_'+sizes[size]; }).join(','),
          url = 'https://api.flickr.com/services/rest?method=flickr.photosets.getPhotos&api_key=' + apiKey + '&photoset_id=' +
                photosetId + '&extras=' + sizeParams + '&format=json';

      photoswipeFlickr.xhr('JSONP', url)
        .error(function(data) {
          alert('Getting photos from Flickr failed. Check the console.');
        })
        .success(function(data) {
          var i, items = [];

          for (i in data.photoset.photo) {
            var photo = data.photoset.photo[i],
                item = { sizeData: {} },
                size, ext;
            for (size in sizes)
            {
              ext = sizes[size];
              item.sizeData[ext] = {
                src: photo['url_'+ext],
                w: photo['width_'+ext],
                h: photo['height_'+ext],
              }
              item.original_src = photo.url_o;
              //item.title = photo.title;
            }
            items.push(item);
          };

          photoswipeFlickr._flickrData = items;

          photoswipeFlickr._initGallery(photoswipeFlickr._flickrData, photoswipeFlickr._galleryOptions);
          callback(photoswipeFlickr._gallery);
        });
    }
  };
};