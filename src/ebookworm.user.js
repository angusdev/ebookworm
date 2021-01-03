/*jshint devel:true */
/*global chrome, console, window, org, unsafeWindow */
(function(){
'use strict';

var utils = org.ellab.utils;
var extract = org.ellab.utils.extract;
var xpathl = org.ellab.utils.xpathl;

var LOADING_IMG = utils.getResourceURL('loading', 'loading.gif');

function DEBUG(msg) {
  if (typeof unsafeWindow !== 'undefined' && unsafeWindow.console && unsafeWindow.console.log) unsafeWindow.console.log(msg); else if (typeof console != 'undefined' && console.log) console.log(msg);
}

function parallelWorker(tag, attrName, pendingAttrValue, workingAttrValue, max, callback, args) {
  if (xpathl('//' + tag + '[@' + attrName + '="' + workingAttrValue +'"]').snapshotLength >= max) {
    return false;
  }

  var res = xpathl('//' + tag + '[@' + attrName + '="' + pendingAttrValue +'"]');

  if (res.snapshotLength === 0) {
    return true;
  }

  for (var i=0 ; i<res.snapshotLength ; i++) {
    // make sure again we don't have more than max
    if (xpathl('//' +tag + '[@' + attrName + '="' + workingAttrValue +'"]').snapshotLength >= max) {
      return false;
    }
    parallelWorker_single(res.snapshotItem(i), attrName, workingAttrValue, callback, args);
  }

  return false;
}

function parallelWorker_single(ele, attrName, workingAttrValue, callback, args) {
  if (!ele) return false;

  // create the loadig image
  var img = document.createElement('img');
  img.src= LOADING_IMG;
  img.className = 'ebookworm-loading-img';
  ele.parentNode.insertBefore(img, ele);
  ele.setAttribute(attrName, workingAttrValue);

  // add the loading img in first argument
  args = args || [];
  args.unshift(0);
  args[0] = img;

  return callback.apply(ele, args);
}

function show(selector, isShow) {
  var ele = document.querySelectorAll(selector);
  ele.forEach(function(e) {
    e.style.display = isShow?'':'none';
  });
}

function mobilismAmazonRating_searchAmazon(loadingImg) {
/* jshint validthis: true */
  var searchTerm = this.textContent.replace(/(\s+series?)*\s+by\s+/i, ', ');
  DEBUG('https://www.amazon.com/s/?url=search-alias%3Dstripbooks&field-keywords=' + encodeURI(searchTerm));

  var ele = this;
  var tr = utils.parent(ele, 'tr');
  tr.className += ' ebookworm-review-0';

  utils.crossOriginXMLHttpRequest({
    method: 'GET',
    url: 'https://www.amazon.com/s/?url=search-alias%3Dstripbooks&field-keywords=' + encodeURI(searchTerm),
    onload: function(t) {
      t = extract(t.responseText, '<li id="result_0"', '</li>', true);
      if (t) {
        var booklink = extract(extract(t, '<a class="a-link-normal s-access-detail-page ', '>'), 'href="', '"');
        DEBUG('booklink=' + booklink);
        var bookimg = extract(extract(t, '<img '), 'src="', '"');
        DEBUG('bookimg=' + bookimg);
        //var bookname = t.match(/<h2 class=[^>]*>([^<]*)/);
        //bookname = bookname?bookname[1]:'';
        var bookname = extract(extract(t, '<h2 ', '</h2>'), '>');
        DEBUG('bookname=' + bookname);
        if (bookname && booklink) {
          bookname = '<a target="_blank" href="' + booklink + '">' + bookname + '</a>';
        }
        var bookauthor = extract(extract(extract(t, '<h2 class='), '<div class="a-row ', '</div>'), '>');
        DEBUG('bookauthor=' + bookauthor);
        if (bookauthor) {
          bookname += ' <i style="font-size:0.8em;">' + bookauthor + '</i>';
        }
        var price;
        var priceStr = extract(t, '<span class="sx-price sx-price-large">');
        if (priceStr) {
          price = extract(priceStr, '<span class="sx-price-whole">', '</span>');
          if (price) {
            var price2 = extract(priceStr, '<sup class="sx-price-fractional">', '</sup>');
            if (price2) {
              price += '.' + price2;
            }
            DEBUG('price=' + price);
          }
        }
        // div
        //   span > span > a
        //     i.a-icon.a-icon-star.a-icon-star-x    <-- rating
        //   a    <-- review count
        var rating = extract(t, '<i class="a-icon a-icon-star ', '>');
        if (rating) {
          rating = '<i class="a-icon a-icon-star ' + rating + '></i>';
        }
        DEBUG('rating=' + rating);
        var review = extract(extract(t, '<i class="a-icon a-icon-star ', '</div>'), '#customerReviews">', '</a>');
        DEBUG('review=' + review);
        if (bookimg) {
          // smaller image size
          bookimg = bookimg.replace(/,.*\.jpg/, '.jpg').replace('160', '100');
          ele.innerHTML = '<img style="float:left;" src="' + bookimg + '"/>';
        }
        if (bookname) {
          ele.innerHTML += bookname + (price?'<br/>$' + price:'') + (rating?('<br/>' + rating + (review?' (' + review + ')':'')):'');
        }

        tr.className += ' ebookworm-review-0';
        if (review >= 1000) {
          tr.className += ' ebookworm-review-1000';
        }
        if (review >= 100) {
          tr.className += ' ebookworm-review-100';
        }
        if (review >= 50) {
          tr.className += ' ebookworm-review-50';
        }
        if (review >= 10) {
          tr.className += ' ebookworm-review-10';
        }
      }

      ele.removeAttribute('ebookworm-search-amazon-status');
      loadingImg.parentNode.removeChild(loadingImg);
      var progress = document.getElementById('ebookworm-search-amazon-progress');
      var completed = parseInt(progress.getAttribute('data-completed'), 10) + 1;
      var completedPct = completed / parseInt(progress.getAttribute('data-total'), 10) * 100;
      progress.setAttribute('data-completed', completed);
      progress.style.backgroundImage = 'linear-gradient(to right, #7b7, #7b7 ' + completedPct + '%, transparent ' + completedPct + '%, transparent 100%)';
      mobilismAmazonRating_searchAmazon_all();
    }
  });
}

function mobilismAmazonRating_searchAmazon_all(ele) {
  var completed = parallelWorker('div', 'ebookworm-search-amazon-status', 'pending', 'working', 3, mobilismAmazonRating_searchAmazon);
  if (completed) {
    document.getElementById('review-filter').style.display = '';
    document.getElementById('ebookworm-search-amazon-progress').style.display = 'none';
  }
}

function mobilismAmazonRating() {
  var res = xpathl('//div[@id="content-forum"]//main/table[2]/tbody/tr//a');

  var totalSearch = 0;
  for (var i=0;i<res.snapshotLength; i++) {
    var a = res.snapshotItem(i);
    var textContent = a.textContent.toUpperCase();
    if (textContent.indexOf('.MOBI') > 0 ||
        textContent.indexOf('.EPUB') > 0 ||
        textContent.indexOf('.PDF') > 0 ||
        textContent.indexOf('.AZW') > 0)
    {
      var bookname = a.innerHTML.replace(/\s*\(.*$/, '');
      var div = document.createElement('div');
      div.setAttribute('ebookworm-search-amazon-status', 'pending');
      div.className = 'ebookworm-search-amazon';
      div.innerHTML = bookname;
      a.parentNode.insertBefore(div, a.nextSibling);
      ++totalSearch;
    }
  }

  var tr = document.querySelector('[role=main] table:nth-of-type(2) tr:first-child');
  if (tr) {
    tr.cells[0].innerHTML += '<span id="review-filter" style="display:none;">&nbsp;&nbsp;&nbsp;&nbsp;' +
                             '<a href="#" data-rating="0">All</a> | ' +
                             '<a href="#" data-rating="1000">1000+</a> | ' +
                             '<a href="#" data-rating="100">100+</a> | ' +
                             '<a href="#" data-rating="50">50+</a> | ' +
                             '<a href="#" data-rating="10">10+</a>' +
                             '</span>' +
                             '<div id="ebookworm-search-amazon-progress" data-total="' + totalSearch + '" data-completed="0"' +
                             ' style="display: inline-block; width: 400px; border: 1px solid #393; margin-left: 20px; padding: 0;">&nbsp</div>';

    tr.addEventListener('click', function(e) {
      var rating = e.target.getAttribute('data-rating');
      if (rating) {
        e.preventDefault();
        if (rating == '0') {
          show('.ebookworm-review-0', true);
        }
        else {
          show('.ebookworm-review-0', false);
          show('.ebookworm-review-' + rating, true);
        }
      }
    });
  }

  mobilismAmazonRating_searchAmazon_all();
}

function mobilismMagazineFilter() {
  chrome.storage.local.get(['blacklist', 'whitelist', 'greylist'], function(items) {
    var blockCount = 0;
    var blacklistSize = items.blacklist?items.blacklist.length:0;
    var whitelistSize = items.whitelist?items.whitelist.length:0;
    var greylistSize = items.greylist?items.greylist.length:0;
    document.querySelectorAll('div.padding_0_40 main > table')[1].querySelectorAll('a.topictitle').forEach(function(v, i) {
      var bookname = v.textContent;

      var lang = bookname.match(/\[([a-zA-Z]{2,3})\]/);
      lang = lang ? lang[1].toUpperCase() : null;

      var filterLang = lang =='TUR' || lang == 'GER' || lang == 'FR' || lang == 'FRA' || lang == 'FRE' ||
                       lang == 'SPA' || lang == 'ESP' || lang == 'ITA' || lang == 'POR' || lang == 'PT' ||
                       lang == 'ML' || lang == 'MS' || lang == 'TH' || lang == 'ROM' || lang == 'FIL' ||
                       lang == 'DUT' || lang == 'POL' || lang == 'RUS' || lang == 'BE';

      var pos = bookname.indexOf('- ');
      var foundSep = false;
      if (pos > 0) {
        bookname = bookname.substring(0, pos).trim();
        foundSep = true;
      }
      else {
        pos = bookname.indexOf('\u2013');
        if (pos > 0) {
          bookname = bookname.substring(0, pos).trim();
          foundSep = true;
        }
        else {
          pos = bookname.indexOf('\u2014');
          if (pos > 0) {
            bookname = bookname.substring(0, pos).trim();
            foundSep = true;
          }
        }
      }

      if (!foundSep) {
        return;
      }

      {
        let tmpdiv = document.createElement('div');
        tmpdiv.textContent = bookname;
        v.innerHTML = v.innerHTML.replace(tmpdiv.innerHTML,
          '<span class="ebookworm-bookname">' + tmpdiv.innerHTML + '</span>');
        tmpdiv = null;
      }

      if (items.whitelist && items.whitelist.includes(bookname)) {
        v.className += ' ebookworm-like';
      }
      else if (items.greylist && items.greylist.includes(bookname)) {
        v.className += ' ebookworm-watch';
      }
      else if (filterLang || (items.blacklist && items.blacklist.includes(bookname))) {
        v.parentNode.parentNode.className += ' ebookworm-block';
        blockCount++;
      }
      else {
        var span = document.createElement('span');
        span.innerHTML = '<a href="#" data-role="ebookworm-block-like-btn" data-block-action="ebookworm-like" style="margin-right: 5px;">👍</span>';
        span.querySelector('a').setAttribute('ebookworm-block-title', bookname);
        v.parentNode.insertBefore(span, v);
        span = document.createElement('span');
        span.innerHTML = '<a href="#" data-role="ebookworm-block-like-btn" data-block-action="ebookworm-watch" style="margin-right: 5px;">👀</span>';
        span.querySelector('a').setAttribute('ebookworm-block-title', bookname);
        v.parentNode.insertBefore(span, v);
        span = document.createElement('span');
        span.innerHTML = '<a href="#" data-role="ebookworm-block-like-btn" data-block-action="ebookworm-block" style="margin-right: 5px;">🚫</span>';
        span.querySelector('a').setAttribute('ebookworm-block-title', bookname);
        v.parentNode.insertBefore(span, v);
      }
    });

    // hide the top section
    let topSectionTable = document.querySelectorAll('div.padding_0_40 main > table')[0];
    if (topSectionTable) {
      topSectionTable.style.display = 'none';
    }

    // hide the top pagination
    let firstNav = document.querySelector('.pagination-small');
    if (firstNav) {
      while (firstNav && firstNav.className.indexOf('row-fluid') < 0 ) {
        firstNav = firstNav.parentNode;
      }
      if (firstNav) {
        firstNav.style.display = 'none';
      }
    }

    // add a button to show back the top section
    let showTopSectionButton = document.createElement('span');
    showTopSectionButton.innerHTML = '<a href="#" type="button" class="btn" style="margin-left:10px; margin-bottom:10px;">Show &quot;SERVICES&quot;</a>'
    showTopSectionButton.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      topSectionTable.style.display = '';
    });
    topSectionTable.parentNode.insertBefore(showTopSectionButton, topSectionTable);

    // copy the pagination to top
    let page = document.querySelector('.pagination.pagination-small');
    page = page.parentNode;
    topSectionTable.parentNode.insertBefore(page.cloneNode(true), topSectionTable);

    // process main section
    document.querySelectorAll('div.padding_0_40 main > table')[1].querySelector('tr:first-child th:first-child').innerHTML +=
      '<span> - ' + blockCount + ' blocked (<a href="#" data-role="ebookworm-showlist" data-list="whitelist">' + whitelistSize + '</a>/<a href="#" data-role="ebookworm-showlist" data-list="blacklist">' + blacklistSize + '</a>)</span>' +
      ' <span><a href="#" data-role="ebookworm-showblock">Show</a></span>';

    /*
    var newblacklist = items.blacklist.filter(function(item, pos) {
    return items.blacklist.indexOf(item) == pos;
    });
    chrome.storage.local.set({blacklist:newblacklist}, function() {
      if (chrome.runtime.lastError) {
        alert(chrome.runtime.lastError.message);
      }
      else {
        alert('clean');
      }
    });
    */

    // remove duplicated
    // for (var i=1 ; i<items.blacklist.length ; i++) {
    //   if (items.blacklist[i] == items.blacklist[i-1]) {
    //     items.blacklist.splice(i-1, 1);
    //     i--;
    //   }
    // }

    // remove too short
    // for (var i=1 ; i<items.blacklist.length ; i++) {
    //   if (items.blacklist[i].length <= 2) {
    //     items.blacklist.splice(i, 1);
    //     i--;
    //   }
    // }

    // remove an item
    // var index = items.blacklist.indexOf('XXXXXXXXXXXXXXXXXXXXXX');
    // if (index > -1) {
    //   items.blacklist.splice(index, 1);
    // }

    // save the blacklist
    // chrome.storage.local.set({blacklist:items.blacklist}, function() {
    //   if (chrome.runtime.lastError) {
    //     alert(chrome.runtime.lastError.message);
    //   }
    //   else {
    //     alert('clean');
    //   }
    // });

    // remove duplicated
    // for (var i=1 ; i<items.whitelist.length ; i++) {
    //   if (items.whitelist[i] == items.whitelist[i-1]) {
    //     items.whitelist.splice(i-1, 1);
    //     i--;
    //   }
    // }

    // remove an item
    // var index = items.whitelist.indexOf('XXXXXXXXXXXXXXXXXXXXXX');
    // if (index > -1) {
    //   items.whitelist.splice(index, 1);
    // }

    // save the whitelist
    // chrome.storage.local.set({whitelist:items.whitelist}, function() {
    //   if (chrome.runtime.lastError) {
    //     alert(chrome.runtime.lastError.message);
    //   }
    //   else {
    //     alert('clean');
    //   }
    // });

    function onblocklike(e, listname, callback) {
      var a = e.target;
      chrome.storage.local.get(listname, function(items) {
        var list = (items && items[listname]) ? items[listname] : [];
        list.push(a.getAttribute('ebookworm-block-title'));
        var toset = {};
        toset[listname] = list;
        chrome.storage.local.set(toset, function() {
          if (chrome.runtime.lastError) {
            alert(chrome.runtime.lastError.message);
          }
          callback(a);
        });
      });

      e.stopPropagation();
      e.preventDefault();
    }

    function onshowlist(e, listname) {
      chrome.storage.local.get(listname, function(items) {
        var list = (items && items[listname]) ? items[listname].sort() : [];
        var div = document.createElement('div');
        div.innerHTML = '<textarea style="width: 100%;" rows="20"></textarea>';
        document.body.appendChild(div);
        var str = '';
        for (var i=0 ; i<list.length ; i++) {
          str += (str?'\n':'') + list[i];
        }
        div.querySelector('textarea').value = str;
      });

      e.stopPropagation();
      e.preventDefault();
    }

    document.querySelectorAll('[data-block-action="ebookworm-block"]').forEach(function(v) {
      v.addEventListener('click', function(e) { onblocklike(e, 'blacklist', function(a) {
        a.parentNode.parentNode.parentNode.className += ' ebookworm-block';
      }); });
    });

    document.querySelectorAll('[data-block-action="ebookworm-like"]').forEach(function(v) {
      v.addEventListener('click', function(e) { onblocklike(e, 'whitelist', function(a) {
        a.parentNode.parentNode.querySelector('.topictitle').className += ' ebookworm-like';
        a.parentNode.parentNode.querySelectorAll('[data-role="ebookworm-block-like-btn"]').forEach(v=>v.style.display = 'none');
      }); });
    });

    document.querySelectorAll('[data-block-action="ebookworm-watch"]').forEach(function(v) {
      v.addEventListener('click', function(e) { onblocklike(e, 'greylist', function(a) {
        a.parentNode.parentNode.querySelector('.topictitle').className += ' ebookworm-watch';
        a.parentNode.parentNode.querySelectorAll('[data-role="ebookworm-block-like-btn"]').forEach(v=>v.style.display = 'none');
      }); });
    });

    document.querySelectorAll('[data-role="ebookworm-showlist"]').forEach(function(v) {
      v.addEventListener('click', function(e) {
        onshowlist(e, e.target.getAttribute('data-list'));
      });
    });

    document.querySelectorAll('[data-role="ebookworm-showblock"]').forEach(function(v) {
      v.addEventListener('click', function(e) {
        document.querySelectorAll('.ebookworm-block').forEach(function(v) {
          v.className = v.className.replace(' ebookworm-block', '');
        });
        e.stopPropagation();
        e.preventDefault();
      });
    });
  });
}

// main
if (/[\.|\/]mobilism\.org\/viewforum\.php\?f=\d+/.test(document.location.href)) {
  var fid = document.location.href.match(/\?f=(\d+)/);
  fid = fid?fid[1]:null;
  // eBook Release - 19
  // Fiction - 1291
  // Fiction - Romance - 1292
  // Fiction - Sci-Fi/Fantasy - 2193
  // Fiction - Mystery/Thriller - 1294
  // Fiction - General Fiction/Classics - 121
  // Fiction - Children/Young Adult - 1295
  // Non-Fiction - 1284
  // Biographies/Memoirs - 1285
  // Computer Related - 892
  // Educational - 122
  // Medical - 545
  // General - 126
  if (fid == 19 || fid == 1291 || fid == 1292 || fid == 1293 || fid == 1294 || fid == 121 || fid == 1295 ||
      fid == 1284 || fid == 1285 || fid == 892 || fid == 122 || fid == 545 || fid == 126) {
    mobilismAmazonRating();
  }
  if (fid == 123) {
    mobilismMagazineFilter();
  }
}

})();
