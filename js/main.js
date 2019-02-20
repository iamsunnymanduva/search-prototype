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
  getInterviewOrder(function(interview) {
    let curr = interview[getParameter("i")];
    loadJSON("flow.json", function(json) {
      if (curr) {
        var location = curr["Location"];
        var handshape = curr["Handshape"];
        var sign = curr["Sign"];
        var index = curr["Index"];
        var similar = curr["Similar"];
        var similar_h = json.Signs[handshape];
        var similar_l = json.Signs[location];
        signs = generateResults(sign, similar, similar_h, similar_l, index);
        // Quick fix for counterbalancing
        setDisplay(interview.length);
      } else {
        var signs = shuffle(json.Signs["Head"]);
      }

      let filler = shuffle(json.Signs["Random"]);
      const MAX = 100;
      let grid = signs.concat(filler.splice(0,MAX - signs.length -1));
      grid.splice(index,0,sign);

      let staticImage = !($('.results-grid').hasClass('word') || $('.results-grid').hasClass('gif'));
      grid.forEach(function(name) {
        addImage(name, staticImage);
      });
      bindResults(staticImage);
      $('.number-of-signs').text(grid.length);
    });
  });
}

function setDisplay(length) {
  // Quick fix for counterbalancing
  let p = getParameter("p");
  let i = getParameter("i");
  let mode = p%2;
  if (i < length/2) {
    mode += 1;
  }
  if (mode == 1) {
    $('.results-grid').addClass('gif');
  }
  // else if (mode == 2) {
  //   $('.results-grid').addClass('word');
  // }
}

function addImage(name, staticImage) {
  let id = name.split(' ').join('_');
  $('.results-grid').append(`<div class="result-box"> <div class="result-image" id="${id}"></div><div class="result-title"><p> ${name} </p></div></div>`);
  if (staticImage) {
    var format = '.png';
  } else if ($('.results-grid').hasClass('gif')) {
    var format = '.gif';
  }

  $(`#${id}`).css('background-image', 'url(../images/' + id + format);
}

function bindResults(staticImage) {
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
      if (staticImage) {
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
  getInterviewOrder(function(interview) {
    let curr = interview[getParameter("i")];
    if (curr) {
      let videoFile = interview[getParameter("i")].Sign + ".mp4";
      let $video = $('.video video');
      $video.attr('src', '../videos/' + videoFile);
      $video[0].load();
    }
  });
}

function getInterviewOrder(callback) {
  loadJSON("flow.json", function(flow) {
    let interview = flow.Flow;
    let p = getParameter("p");

    interview = LatinSquare(interview, p, 1);
    callback(interview);
  });
}

function LatinSquare(arr, p, n) {
  let size = arr.length;
  let move = ((p-1)%(size/n))*n;
  if (move > 0) {
    let displace = arr.splice(0,move);
    return arr = arr.concat(displace);
  }
  return arr;
}

function bindParticipantCode() {
  $('.next').click(getParticipantCode);
  $('.code input').keypress(function(e){
        if(e.which == 13){//Enter key pressed
            getParticipantCode();
        }
    });
}

function getParticipantCode() {
  let p = Number($('.code input').val());
  if (p) {
    window.open("pages/video.html?" + getQuery(0,p),"_self");
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
  getInterviewOrder(function(interview) {
    if (interview.length <= getParameter("i")) {
      $('.content').html('<h1>Thank you</h1>');
    }
  })
  if (path == "results.html") {
    setIndexQuery(getParameter("i") + 1, '.home a');
    loadGrid();
    backToTop();
  } else if (path == "record.html") {
    getCamera();
    bindRecord();
  } else if (path == "video.html") {
    setIndexQuery(getParameter("i"), '.next');
    getVideo();
  } else if (path == "index.html" || path == "") {
    bindParticipantCode();
  }
}
