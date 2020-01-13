// ==UserScript==
// @name         Better Rupark
// @namespace    http://tampermonkey.net/
// @version      0.7.3
// @description  RP forum extensions
// @author       Wiblz
// @include      http*://rupark.com/*
// @exclude      http*://rupark.com/game*

// @updateURL    https://github.com/Wiblz/Better-RP/raw/master/BRP.user.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue

// @require      https://code.jquery.com/jquery-3.4.1.min.js
// @require      https://github.com/Wiblz/Better-RP/raw/master/blacklist.js
// ==/UserScript==

String.prototype.hashCode = function() {
  let hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

/* Global module object */
const BRP = (function() {
  'use strict';

  const BRP = {};

  BRP.VERSION_STRING = 'v0.7.3';
  BRP.WHATS_NEW_URL = 'https://rupark.com/topic1212351/';
  BRP.VERSION_COLOR = '#1930d0';
  BRP.DEBUG_MODE = false;

  BRP.GREEN = '#0ed217';
  BRP.RED = '#8a2424';
  BRP.CURRENT_YEAR = '2020';

  BRP.paginationEnabled = false;

  BRP.User = {};

  BRP.User.nickname = null;
  BRP.User.banned = false;
  BRP.User.logged_out = false;

  BRP.User.detectUser = function() {
    this.nickname = $('.userpic > a').first().attr('title');
    if (this.nickname === undefined) {
      this.logged_out = true;
      return;
    }
    this.nicknameHash = this.nickname.hashCode();

    if (banned.has(this.nicknameHash)) {
      GM_setValue('banned', '1');
    }

    this.banned = GM_getValue('banned') != null;
  }


  BRP.Dates = {};

  BRP.Dates.convertMonth = function(russianName) {
    switch (russianName) {
      case 'января':
        return 'Jan';
      case 'февраля':
        return 'Feb';
      case 'марта':
        return 'Mar';
      case 'апреля':
        return 'Apr';
      case 'мая':
        return 'May';
      case 'июня':
        return 'Jun';
      case 'июля':
        return 'Jul';
      case 'августа':
        return 'Aug';
      case 'сентября':
        return 'Sep';
      case 'октября':
        return 'Oct';
      case 'ноября':
        return 'Nov';
      case 'декабря':
        return 'Dec';
      default:
        return null;
    }
  }

  BRP.Dates.parseDate = function(str) {
    let parts = str.replace(/,/g, '').split(' ');

    // "сегодня", "вчера" or something else indefinite
    if (isNaN(parts[0])) {
      return new Date();
    }

    parts[1] = this.convertMonth(parts[1]);
    if (isNaN(parts[2])) {
      parts.push(parts[2]);
      parts[2] = BRP.CURRENT_YEAR;
    }

    return new Date(parts.join(' '));
  }


  BRP.Ignore = {};

  BRP.Ignore.ignoredUsers = GM_listValues().filter(str => str.startsWith('ignore_'))
                                           .map(str => str.substring(7));

  BRP.Ignore.addIgnoreButton = function(nickname) {
    let $userInfo = $('.inputform-m');

    if ($userInfo.length == 0) {
      return;
    }

    let ignoreButton = $(document.createElement('a')).addClass('button')
                                                     .css({ cursor : 'pointer' });

    if (GM_getValue('ignore_' + nickname, null) != null) {
      ignoreButton.text('Убрать из игнора')
                  .addClass('unignore');
    } else {
      ignoreButton.text('Добавить в игнор');
    }

    ignoreButton.appendTo($('tr:last>:first-child', $userInfo));

    ignoreButton.click(function() {
      if (ignoreButton.hasClass('unignore')) {
        GM_deleteValue('ignore_' + nickname);
        BRP.Ignore.ignoredUsers = BRP.Ignore.ignoredUsers.filter(e => e !== nickname);       
        ignoreButton.text('Добавить в игнор');
      } else {
        GM_setValue('ignore_' + nickname, 0);
        BRP.Ignore.ignoredUsers.push(nickname);
        ignoreButton.text('Убрать из игнора');
      }

      ignoreButton.toggleClass('unignore');
    });
  }

  BRP.Ignore.unignore = function(button) {
    let row = button.parent().parent();
    let nickname = row.find('.userNickname').first().text();

    GM_deleteValue('ignore_' + nickname);
    this.ignoredUsers = this.ignoredUsers.filter(e => e !== nickname);
    row.remove();

    $('.tabbar>').last().text(this.getIgnoreTabText());
  }

  BRP.Ignore.getIgnoreTabText = function() {
    if (this.ignoredUsers.length != 0) {
      return 'Игнор (' + this.ignoredUsers.length + ')';
    } else {
      return 'Игнор';
    }
  }

  BRP.Ignore.addIgnoredUsersTab = function() {
    let $tabs = $('.tabbar')

    let ignoredUsersTab = $(document.createElement('a')).addClass('rounded7')
                                                        .attr({ href : '#' })
                                                        .text(this.getIgnoreTabText())
                                                        .appendTo($tabs);

    ignoredUsersTab.click(() => {
      if (ignoredUsersTab.hasClass('active')) {
        return;
      }

      $tabs.siblings()
           .hide();

      $tabs.find('.active')
           .toggleClass('active');
      ignoredUsersTab.addClass('active');

      let $table = $(document.createElement('table')).addClass('grid')
                                                     .appendTo($tabs.parent());
      let $tbody = $(document.createElement('tbody')).appendTo($table);

      for (let user of this.ignoredUsers) {
        let $row = $(document.createElement('tr')).css('background', BRP.RED)
                                                  .html('<td><h4 style="margin-top: 0.4em"><a href="rupark.com/user/' + user + '" class="userNickname" style="margin-left:20px">' + user + '</a></h4></td>')
                                                  .appendTo($tbody);

        let $buttonColumn = $(document.createElement('td')).css('width', '10px')
                                                           .appendTo($row);
        let $unignoreButton = $(document.createElement('a')).addClass('button block')
                                                            .text('Убрать из игнора')
                                                            .css('cursor', 'pointer')
                                                            .click(function() {
                                                              BRP.Ignore.unignore($(this));
                                                            })
                                                            .appendTo($buttonColumn);
      }
    });
  }

  BRP.ImageResize = {
    hovered: false,
    pressed: false,
    dragged: false,
    distance: 0,

    initialX: 0,
    initialY: 0,

    multiplier: 1.0,
    dragged: 0,
    width: 0,
    height: 0,

    setListeners: function() {
      let $images = $('.txt').find('img');
      // let $images = $('.txt.content').find('img');

      let $win = $(window);
      
      let $container = $(document.createElement('div')).css({
          'position' : 'fixed',
          'display' : 'block',
          'background' : 'rgb(85, 85, 85)',
          'padding' : '8px',
          'z-index' : '1001'
        }).addClass('fullscreen-container')
          .mouseover(() => {
            this.hovered = true;
        }).mouseout(() => {
            this.hovered = false;
        }).mousedown((e) => {
          if (this.hovered) {
            this.initialX = e.clientX;
            this.initialY = e.clientY;

            this.dragged = true;
            this.distance = 0;

            e.preventDefault();
          }
        }).mouseup(() => {
            if (this.distance <= 3) {
              $container.hide();
              $container.html('');
              this.multiplier = 1.0;
            }

            this.dragged = false;
        }).appendTo('body')
          .hide();

      $images.css('cursor', 'pointer')
            .click(function(e) {
              $container.css({
                'width' : this.width,
                'height' : this.height,
                'left' : ((window.innerWidth - this.width) / 2),
                'top' : ((window.innerHeight - this.height) / 2)
              }).show();
              
              BRP.ImageResize.width = this.width
              BRP.ImageResize.height = this.height

              $(document.createElement('img')).attr('src', this.src)
                                              .css({
                                                'width' : '100%',
                                                'height' : '100%'
                                              })
                                              .appendTo($container);

              e.preventDefault();
      });

      $container[0].addEventListener('wheel', (e) => {
        if (this.hovered) {
          let x_ratio = (e.clientX - parseFloat($container[0].style.left)) / this.width / this.multiplier
          let y_ratio = (e.clientY - parseFloat($container[0].style.top)) / this.height / this.multiplier

          if (e.deltaY > 0 && this.multiplier > 0.4) {
            this.multiplier -= 0.3;
          } else if (e.deltaY < 0 && this.multiplier < 10.0) {
            this.multiplier += 0.3;
          }

          $container.css({
            'width' : this.width * this.multiplier,
            'height' : this.height * this.multiplier,

            'left' : e.clientX - x_ratio * this.width * this.multiplier,
            'top' : e.clientY - y_ratio * this.height * this.multiplier
          });

          e.preventDefault();
        }
      });

      $win.mousemove((e) => {
        if (this.dragged) {
          let deltaX = e.clientX - this.initialX;
          let deltaY = e.clientY - this.initialY;

          this.distance += (Math.abs(deltaX) + Math.abs(deltaY));

          this.initialX = e.clientX;
          this.initialY = e.clientY;

          let el_top = parseInt($container.css('top'));
          let el_left = parseInt($container.css('left'));

          $container.css({
              top: (el_top + deltaY) + 'px',
              left: (el_left + deltaX) + 'px'
          });
        }
      });

      $win.mousedown(() => {
        if (!BRP.ImageResize.hovered) {
          $container.hide();
          $container.html('');
          this.multiplier = 1.0;
        }
      });
    }
  }

  return BRP;
}());

$(() => {
  function randomColor() {
    return '#'+((1<<24)*Math.random()|0).toString(16);
  }

  function isURL(str) {
    return window.location.pathname.startsWith(str);
  }

  /*
    FIX: presents situation
  */
  function wrapRelevantText() {
    $('.txt').each(function(_, node) {
      let nodes = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, null);
      let textNode;
      
      while (textNode = nodes.nextNode()) {
        let parent = textNode.parentNode;

        if (/\S/.test(textNode.nodeValue) && parent.nodeName == 'DIV') {
          let text = textNode.nodeValue;
          let spanWrapper = document.createElement('span');

          // trimming only text on presents tab
          if (isURL('/user/') && window.location.pathname.endsWith('/presents/')) {
            spanWrapper.innerText = text.trim();
          } else {
            spanWrapper.innerText = text;
          }
          spanWrapper.className = 'relevant-text';

          textNode.nodeValue = '';
          parent.insertBefore(spanWrapper, textNode);
        }
      }
    });
  }

  //
  function modifyNavigationBar() {
    const $table = $('.mainmenu > ul');
    let button = $(document.createElement('li'));
    let currentVersionNode = $(document.createElement('li')).css({
      position : 'absolute',
      right : '10px'
    }).appendTo($table);

    $currentVersionLink = $(document.createElement('a')).css({
                                                          'font-weight' : 'bold',
                                                          'color' : BRP.VERSION_COLOR
                                                        }).appendTo(currentVersionNode);

    if (BRP.User.banned) {
      $currentVersionLink.text('СОСИ ХУЙ БЫДЛО')
                         .attr('href', '#');

      return;
    } else if (BRP.User.logged_out) {
      $currentVersionLink.text('Log in first')
                         .attr('href', '#');

      return;
    }

    // link to what's new topic
    $currentVersionLink.text('BRP ' + BRP.VERSION_STRING)
    .attr('href', BRP.WHATS_NEW_URL);
    
    // notification about new version
    if (GM_getValue('version') != BRP.VERSION_STRING) {
      $(document.createElement('span')).text('New!')
                                       .css({
                                          color : BRP.GREEN,
                                          'margin-right' : '7px',
                                          'font-size' : '12px'
                                        }).mouseover(function() {
                                          $(this).hide();
                                          GM_setValue('version', BRP.VERSION_STRING);
                                        }).prependTo(currentVersionNode);
    }

    if (BRP.DEBUG_MODE) {
      $(document.createElement('a')).text('Clear Data')
                                    .attr('href', '#')
                                    .css({
                                      'font-weight' : 'bold',
                                      'color' : BRP.VERSION_COLOR,
                                      'margin-right' : '10px',
                                      'margin-left'  : '10px'
                                    }).click(() => {
                                      for (let value of GM_listValues()) {
                                        GM_deleteValue(value);
                                      }
                              
                                      console.log('Value list cleared.');
                                    }).appendTo(currentVersionNode);
    }

    if (window.location.pathname.startsWith('/all')) {
      button.html('<a href=\'/all/\' style= \'text-decoration: none\'><b>Все топики</b></a>');
    } else {
      button.html('<a href=\'/all/\'>Все топики</a>');
    }

    button.prependTo($table);
  }

  //
  function addJumpToTopPanel() {
    let p = 0;
    let clicked = false;

    $panel =  $(document.createElement('span')).css({
                width : '10%',
                height : '100%',
                display : 'block',
                position : 'fixed',
                top : 0,
                right : 0,
                background : '#222222',
                'z-index' : '998',
                'cursor' : 'pointer'
              }).click(function() {
                  s = p;
                  p = document.scrollingElement.scrollTop;
                  clicked = true;
                  scroll(0, s);
                  // $(this).hide();
              }).mouseover(function() {
                  $(this).css('background', '#4d4d4d');
              }).mouseout(function() {
                  $(this).css('background', '#222222');
              }).appendTo($('body'));

    if (document.scrollingElement.scrollTop == 0) {
      $panel.hide();
    }

    $(window).scroll(function() {
      if (clicked) {
        clicked = false;
      } else {
        p = 0;
        document.scrollingElement.scrollTop == 0 ? $panel.hide() : $panel.show();
      }
    })
  }

  //
  function modifyNicknames() {
    $('.url.fn.nickname').each((_, nickname) => {
      if (nickname.innerText == 'Zefir4eG') {
        modifyNickname($(nickname), '#FFC0CB', 'https://image.flaticon.com/icons/png/128/862/862724.png');
      }

      if (nickname.innerText == 'Нейтральный Джим' ||
          nickname.innerText == 'микрочелик') {
        modifyNickname($(nickname), null, 'https://image.flaticon.com/icons/svg/138/138533.svg');
      }
    })
  }

  //
  function handleComments() {
    let topicID = 'top' + window.location.pathname.slice(6, -1);
    let $comments = $('.ps.comment');
    let ignoreSequence = false;
    let ignoredOffset = 0;

    $comments.each(function(_, comment) {
      let $comment = $(comment);
      let author = $comment.find('.url.fn.nickname').first().attr('title');
      let offset = Number($comment.css('margin-left').slice(0, -2));

      if (ignoreSequence) {
        if (offset > ignoredOffset) {
          $comment.hide();
        } else {
          ignoreSequence = false;
        }
      } else if (BRP.Ignore.ignoredUsers.includes(author)) {
        $comment.hide();
        ignoreSequence = true;
        ignoredOffset = offset;
      }
    });

    $('.reply').click(function() {
      $btn = $(this);
      if (!$btn.hasClass('active')) {
        $btn.addClass('active');
    
        $('.addcomment input').click(function() {
          let trackedTopics = GM_listValues().filter(str => str.startsWith('top'));
          if (trackedTopics.includes(topicID)) {
            GM_setValue(topicID, GM_getValue(topicID) + 1);
          }
        })
      }    
    });

    BRP.ImageResize.setListeners();
  }

  /**
   * Helper function for adding listeners on links to topic
   */
  function addLinkListeners(topicNode, numericId, commentCount) {
    topicNode.find('a').each(function(_, link) {
      if (link.href.match(numericId) != null) {
        $(link).click(() => {
          GM_setValue(topicNode.attr('id'), commentCount);
        });
      }
    })
  }

  //
  function handleTopics() {
    let $topics = $('.ps.hentry.blogs');

    // Tracking comment numbers of topics up to week old.
    let importanceTreshold = new Date();
    importanceTreshold.setDate(importanceTreshold.getDate() - 7);

    $topics.each(function(_, topic) {
      let $topic = $(topic);
      let id = $topic.attr('id');
      let author = $topic.find('.url.fn.nickname').attr('title');
      let datePublished = BRP.Dates.parseDate($topic.find('.published.updated').text());
      let numericId = id.substring(3);

      let $entryInfoNode = $topic.find('.panel.entry-info');
      let commentCountStr = $entryInfoNode.children('a:last')[0].nextSibling.nodeValue;
      let commentCount = parseInt(commentCountStr.substring(2, commentCountStr.length - 1));

      let $entryTitleNode = $topic.find('.entry-title');
      let trackedTopics = GM_listValues().filter(str => str.startsWith('top'));

      if (trackedTopics.includes(id)) {
        if (datePublished < importanceTreshold) {
          GM_deleteValue(id);
        } else if (GM_getValue(id) < commentCount) {
          // Add amount of new comments
          $(document.createElement('b')).text('+' + (commentCount - GM_getValue(id)))
                                        .css({
                                          color : BRP.GREEN,
                                          'margin-left' : '4px',
                                          'font-size' : 'small'
                                        }).mouseover(function() {
                                          $(this).hide();
                                          GM_setValue(id, commentCount);
                                        }).insertBefore($entryInfoNode.children().last());

          addLinkListeners($(topic), numericId, commentCount);
        }
      } else if (datePublished > importanceTreshold) {
        if (author == BRP.User.nickname) {
          GM_setValue(id, commentCount);
        } else {
          $(document.createElement('b')).text('New!')
                                        .css({
                                          color : BRP.GREEN,
                                          'margin-left' : '7px',
                                          'font-size' : 'medium'
                                        }).mouseover(function() {
                                          $(this).hide()
                                          GM_setValue(id, commentCount); // save current amount of comments
                                        }).appendTo($entryTitleNode);
        }

          addLinkListeners($(topic), numericId, commentCount);
      }

      if (BRP.Ignore.ignoredUsers.includes(author)) {
        $topic.hide();
      }
    })
  }

  //
  function modifyNickname(node, color, iconSrc) {
    $(document.createElement('img')).attr({
      src : iconSrc,
      width : '12px',
      height : 'auto'
    }).css({   
      'margin-bottom' : '-1px',
      'margin-right'  : '5px'
    }).prependTo($(node))

    node.css({
      'margin-left' : '-73px'
    });

    if (color != null) {
      node.css('color', color);
    }
  }

  function emotes(node) {
    node.innerHTML = node.innerHTML.replace(/(^|\s)pepega($|\s)/g, ' <img src="https://cdn.frankerfacez.com/emoticon/243789/1"> ');
    node.innerHTML = node.innerHTML.replace(/(^|\s)peepoClown($|\s)/g, ' <img src="https://cdn.frankerfacez.com/emoticon/318914/1"> ');
    node.innerHTML = node.innerHTML.replace(/(^|\s)zeroClown($|\s)/g, '<img src="https://i.postimg.cc/cJ5qkH4w/zero-Clown.png" width="32px">');
  }

  function words(node) {
    let words = node.innerHTML.split('.')
                          .map(sentence => sentence.split(',')
                                                   .map(words => words.split(' ')
                                                                      .map(word => specialWords.has(word.hashCode()) ? '<b style="color:' + randomColor() + '">петух</b>' : word)
                                                                      .join(' '))
                                                   .join(','))
                          .join('.');

    node.innerHTML = words;
  }

  BRP.User.detectUser();
  modifyNavigationBar();

  if (!BRP.User.banned) {
    addJumpToTopPanel();
    modifyNicknames();

    wrapRelevantText();

    $('.relevant-text').each(function(_, node) {
      words(node);
      emotes(node);
    })

    if (isURL('/user/')) {
      console.log('user page')
      let page_owner = $('.item.vcard.fn.nickname').first().text()

      if (page_owner == BRP.User.nickname) {
        BRP.Ignore.addIgnoredUsersTab();
      } else {
        BRP.Ignore.addIgnoreButton(page_owner);
      }
    } else if (isURL('/blog') ||
               isURL('/all') ||
               isURL('/news') ||
               isURL('/topics') ||
               isURL('/clans') ||
               isURL('/personal') ||
               isURL('/sandbox') ||
               isURL('/flood') ||
               window.location.pathname.match(/^\/[0-9]*$/) != null) {
                 console.log('page with topics')
                 BRP.paginationEnabled = true;
                 handleTopics();
    } else if (isURL('/topic')) {
      console.log('inside the topic')
      handleComments();
    }
  }
});
