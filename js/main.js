$(document).ready(__main__);

function getCamera() {
  let video = $('#video').get(0);
  if (video) {
    // Get access to the camera!
    if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Not adding `{ audio: true }` since we only want video now
        navigator.mediaDevices.getUserMedia({ video: true }).then(function(stream) {
            //video.src = window.URL.createObjectURL(stream);
            video.srcObject = stream;
            video.play();
        });
    }
  }
}

function bindRecord() {
  $('.record-button').click(function() {
    if ($(this).hasClass('stop')) {
        showResults($(this))
    } else  {
      countdown($(this));
    }
  });
}

function countdown(record_button) {
  let overlay = $('.video-overlay');
  let time = $('.time');

  overlay.addClass('on');
  record_button.addClass('recording');

  time.text('3');
  let timeleft = 2;
  let downloadTimer = setInterval(function(){
    time.text(timeleft);
    timeleft -= 1;
    if(timeleft < 0) {
      clearInterval(downloadTimer);
      record_button.removeClass('record').addClass('stop');
      overlay.removeClass('on');
      time.text('');
    }
  }, 1000);
}

function showResults(record_button) {
  record_button.removeClass('stop recording').addClass('loading');
  $('.video-overlay').addClass('on');

  let downloadTimer = setTimeout(function() {
    let index = getParameter("i");
    let p = getParameter("p");
    window.open("results.html?" + getQuery(index,p),"_self");
  },2000);
}

function setIndexQuery(index, selector) {
  $(selector).attr('href', function() {
    let p = getParameter("p");
    return $(this).attr('href') + getQuery(index,p);
  });
}

function getQuery(i,p) {
  return "i=" + i + "&p=" + p;
}

function loadGrid() {
  loadJSON("flow.json", function(flow) {
    let i = getParameter("i");
    let p = getParameter("p");

    if (i >= 0) {
      var signs_order = flow.Flow;
      var ks = LatinSquare(flow.Ks,p);
      var index = ks[i%ks.length];
      var curr = signs_order[i];
      var total_signs_flow = signs_order.length;
    } else {
      var curr = flow.Sample;
      var index = curr["Index"];
      var total_signs_flow = 1;
    }
    let all_signs = flow.Signs;
    let display_modes = flow.Display_modes;

    if (curr) {
      var location = curr["Location"];
      var handshape = curr["Handshape"];
      var sign = curr["Sign"];
      var similar = curr["Similar"];
      var similar_h = all_signs[handshape];
      var similar_l = all_signs[location];
      signs = generateResults(sign, similar, similar_h, similar_l, index);
      setDisplay(total_signs_flow, LatinSquare(display_modes,p), p, i);
      } else {
        var signs = shuffle(all_signs["Head"]);
      }

      let filler = shuffle(all_signs["Random"]);
      const MAX = 100;
      let grid = signs.concat(filler.splice(0,MAX - signs.length -1));
      grid.splice(index,0,sign);

      let staticImage = !($('.results-grid').hasClass('word') || $('.results-grid').hasClass('gif'));
      grid.forEach(function(name) {
        addImage(name, staticImage);
      });
      bindResults(staticImage);
      $('.number-of-signs').text($('.results-grid').length);
    });
}

function setDisplay(total, modes, p, i) {
  // 0 is thumbnails
  // 1 is gifs
  let n_modes = modes.length;
  let mode_index = Math.floor(i/(total/modes.length));
  let mode = modes[mode_index];
  if (mode == 1) {
    $('.results-grid').addClass('gif');
  }
}

function addImage(name, staticImage) {
  let id = name.split(' ').join('_');
  $('.results-grid').append(`<div class="result-box"> <div class="result-image" id="${id}"></div><div class="result-title"><p> ${name} </p></div></div>`);
  let curr = $(`#${id}`);
  if (staticImage) {
    var format = '.png';
  } else if ($('.results-grid').hasClass('gif')) {
    curr.addClass('gif');
    var format = '.gif';
  }

  curr.css('background-image', 'url(../images/' + id + format);
}

function bindResults() {
  $('.results-grid.word .result-box').hover(function() {
    //$('.result-title').removeClass('hide-word');
    $(this).find('.result-title').toggleClass('hide-word');
  });

  $('.result-image').hover(function() {
    let name = $(this).attr('id');
    $(this).toggleClass('active');
    if ($(this).hasClass('active')) {
      $(this).css('background-image', 'url(../images/' + name + '.gif)');
    } else {
      if (!$(this).hasClass('gif')) {
        $(this).css('background-image', 'url(../images/' + name + '.png)');
      } else if ($('.results-grid').hasClass('word')) {
        $(this).css('background-image', 'none');
      }
    }
  });
}

function loadJSON(filename, callback) {
    $.ajax({
        'global': false,
        'url': "../js/" + filename,
        'dataType': "json",
        'success': function(data) {
          callback(data)
        }
    });
}

function shuffle(o) {
	for(let j, x, i = o.length; i; j = parseInt(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
	return o;
}

function generateResults(el, similar, handshape, location, index) {
  deleteElement(el, handshape);
  deleteElement(el, location);
  for (let i=0;i<similar.length;i++) {
    deleteElement(similar[i], handshape);
  }
  shuffle(similar);
  shuffle(handshape);
  shuffle(location);

  let before = [];
  let after = [];
  let similar_fill = similar.length - index;
  let handshape_fill = handshape.length - Math.abs(similar_fill);
  if (similar_fill > 0) {
    before = similar.splice(0, index);
    after = similar.concat(handshape).concat(location);
  } else if (handshape_fill > 0) {
    let fill = Math.abs(similar_fill);
    before = similar.concat(handshape.splice(0,fill));
    after = handshape.concat(location);
  } else {
    // Assuming similar + handshape + location > index
    let fill = Math.abs(handshape_fill);
    before = similar.concat(handshape).concat(location.splice(0,fill));
    after = location;
  }

  shuffle(before);

  return before.concat(after);
}

function deleteElement(el, arr) {
  let curr = arr.indexOf(el);
  arr.splice(curr,1);
}

function getParameter(p) {
  let parsedUrl = new URL(window.location.href);
  return Number(parsedUrl.searchParams.get(p));
}

function getVideo() {
  loadJSON("flow.json", function(flow) {
    let i = getParameter("i");
    if (i >= 0) {
      let sign_order = flow.Flow;
      var curr = sign_order[i];
    } else {
      var curr = flow.Sample;
    }
    if (curr) {
      let videoFile = curr.Sign + ".mp4";
      let $video = $('.video video');
      $video.attr('src', '../videos/' + videoFile);
      $video[0].load();
    }
  });
}


function LatinSquare(arr, p, n) {
  if (!n) {
    n = 1;
  }
  let size = arr.length;
  let move = ((p-1)%(size/n))*n;
  if (move > 0) {
    let displace = arr.splice(0,move);
    return arr = arr.concat(displace);
  }
  return arr;
}

function bindParticipantCode(startingPoint) {
  $('.next').click(function() {
    getParticipantCode(startingPoint);
  });
  $('.code input').keypress(function(e){
        if(e.which == 13){//Enter key pressed
            getParticipantCode(startingPoint);
        }
    });
}

function getParticipantCode(startingPoint) {
  let p = Number($('.code input').val());
  if (p) {
    window.open("pages/sample.html?" + getQuery(startingPoint,p),"_self");
  } else {
    window.alert("Please enter a valid code");
  }
}

function getEndOfPath(path) {
  let locations = path.split("/");
  let n = locations.length;
  return locations[n-1];
}

function backToTop() {
  var btn = $('#button');

  $(window).scroll(function() {
    if ($(window).scrollTop() > 300) {
      btn.addClass('show');
    } else {
      btn.removeClass('show');
    }
  });

  btn.on('click', function(e) {
    e.preventDefault();
    $('html, body').animate({scrollTop:0}, '300');
  });
}

function __main__() {
  let path = getEndOfPath(window.location.pathname);
  let i = getParameter("i");
  loadJSON("flow.json", function(flow) {
    let sign_order = flow.Flow;
    if (sign_order.length <= i) {
      $('.content').html('<h1>Thank you</h1>');
    }
  })
  if (path == "results.html") {
    setIndexQuery(i + 1, '.home a');
    loadGrid();
    backToTop();
  } else if (path == "record.html") {
    getCamera();
    bindRecord();
  } else if (path == "video.html") {
    setIndexQuery(i, '.next');
    getVideo();
  } else if (path == "index.html" || path == "") {
    bindParticipantCode(-1);
  } else if (path == "sample.html") {
    setIndexQuery(i, '.next')
    bindResults();
  }
}
