// ==UserScript==
// @name         Better Rupark
// @namespace    http://tampermonkey.net/
// @version      0.5
// @description  RP forum extensions
// @author       Wiblz
// @include      http*://rupark.com/*
// @exclude      http*://rupark.com/game

// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

let VERSION_STRING = "v0.5";
let WHATS_NEW_URL = "https://rupark.com/topic1209735/";
let DEBUG_MODE = false;
let USERNAME = null;

let VERSION_COLOR = "#cc7ace"
let GREEN = "#0ed217";

String.prototype.hashCode = function() {
  var hash = 0, i, chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr   = this.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

function randomColor() {
   return "#"+((1<<24)*Math.random()|0).toString(16);
}

function convertMonth(russianName) {
    switch (russianName) {
        case "января":
            return "Jan";
        case "февраля":
            return "Feb";
        case "марта":
            return "Mar";
        case "апреля":
            return "Apr";
        case "мая":
            return "May";
        case "июня":
            return "Jun";
        case "июля":
            return "Jul";
        case "августа":
            return "Aug";
        case "сентября":
            return "Sep";
        case "октября":
            return "Oct";
        case "ноября":
            return "Nov";
        case "декабря":
            return "Dec";
        default:
            return null;
    }
}

function parseDate(str) {
    let parts = str.replace(/,/g, '').split(' ');

    // "сегодня", "вчера" or something else indefinite
    if (isNaN(parts[0])) {
        return new Date();
    }

    parts[1] = convertMonth(parts[1]);
    if (isNaN(parts[2])) {
        parts.push(parts[2]);
        parts[2] = "2019";
    }

    return new Date(parts.join(' '));
}

function wrapRelevantText() {
    for (var node of document.getElementsByClassName("txt")) {
        var nodes = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, null);
        var textNode;
        while (textNode = nodes.nextNode()) {
            var parent = textNode.parentNode;
            var text = textNode.nodeValue;

            var spanWrapper = document.createElement("span");
            spanWrapper.innerText = text;
            spanWrapper.className = "relevant-text";

            textNode.nodeValue = "";
            parent.insertBefore(spanWrapper, textNode);
        }
    }
}

function modifyNavigationBar() {
    let button = document.createElement("li");
    let currentVersionNode = document.createElement("li");

    currentVersionNode.style.position = "absolute";
    currentVersionNode.style.right = "10px";

    let currentVersionLink = document.createElement("a");
    currentVersionLink.innerText = "BRP " + VERSION_STRING;
    currentVersionLink.setAttribute("href", WHATS_NEW_URL);
    currentVersionLink.style.fontWeight = "bold";
    currentVersionLink.style.color = VERSION_COLOR;

    if (DEBUG_MODE) {
        let debugClearValues = document.createElement("a");
        debugClearValues.innerText = "Clear Data";
        debugClearValues.setAttribute("href", "#");
        debugClearValues.style.fontWeight = "bold";
        debugClearValues.style.color = VERSION_COLOR;
        debugClearValues.style.marginRight = "10px";

        debugClearValues.addEventListener("click", function() {
            for (let value of GM_listValues()) {
                GM_deleteValue(value);
            }

            console.log("Value list cleared.");
        });

        currentVersionNode.appendChild(debugClearValues);
    }

    currentVersionNode.appendChild(currentVersionLink);

    if (window.location.href == "https://rupark.com/all/") {
        button.innerHTML = "<a href=\"/all/\" style= \"text-decoration: none\"><b>Все топики</b></a>";
    } else {
        button.innerHTML = "<a href=\"/all/\">Все топики</a>";
    }

    let table = document.getElementsByClassName("mainmenu")[0].getElementsByTagName("ul")[0];
    table.insertBefore(button, table.firstChild);
    table.appendChild(currentVersionNode);
}

function addJumpToTopPanel() {
    let panel = document.createElement("span");

    panel.style.cssText = "width:10%;height:100%;display:none;position:fixed;top:0;right:0;background:#222222;z-index:-999;";

    panel.addEventListener("mouseover", function() { panel.style.background = "#4d4d4d" });
    panel.addEventListener("mouseout", function() { panel.style.background = "#222222" });
    panel.addEventListener("click", function() {
        scroll(0,0);
        panel.style.display = "none";
    });

    window.addEventListener("scroll", function() {
        document.scrollingElement.scrollTop == 0 ? panel.style.display = "none" : panel.style.display = "block";
    });

    document.getElementsByTagName("body")[0].appendChild(panel);
}

function detectUser() {
    let userpic = document.getElementsByClassName("userpic");

    if (userpic.length !=0) {
        USERNAME = userpic[0].firstElementChild.getAttribute("title");
    }
}

function unignore(button) {
    let row = button.parentElement.parentElement;
    let nickname = row.getElementsByClassName("userNickname")[0].innerText;

    GM_deleteValue("ignore_" + nickname);
    row.remove();

    updateIgnoredCount(document.getElementsByClassName("tabbar")[0].lastElementChild, GM_listValues().filter(str => str.startsWith("ignore_"))
                                                                                                     .map(str => str.substring(7)));
}

function updateIgnoredCount(tab, userList) {
    if (userList.length != 0) {
        tab.innerText = "Игнор (" + userList.length + ")";
    } else {
        tab.innerText = "Игнор";
    }
}

function addIgnoredUsersTab() {
    let tabs = document.getElementsByClassName("tabbar")[0];

    let ignoredUsersTab = document.createElement("a");
    ignoredUsersTab.setAttribute("class", "rounded7");
    ignoredUsersTab.setAttribute("href", "#");

    let ignoredUsers = GM_listValues().filter(str => str.startsWith("ignore_"))
                                          .map(str => str.substring(7));

    updateIgnoredCount(ignoredUsersTab, ignoredUsers);

    tabs.appendChild(ignoredUsersTab);

    ignoredUsersTab.addEventListener("click", function() {
        if (ignoredUsersTab.classList.contains("active")) {
            return;
        }

        var sibling = tabs.nextElementSibling;
        while (sibling != null) {
            sibling.style.display = "none";
            //sibling.remove();
            sibling = sibling.nextElementSibling;
        }

        for (var element of document.getElementsByClassName("rounded7 active")) {
            element.setAttribute("class", "rounded7");
        }

        ignoredUsersTab.setAttribute("class", "rounded7 active");

        let table = document.createElement("table");
        table.setAttribute("class", "grid");
        let tbody = document.createElement("tbody");
        table.appendChild(tbody);

        for (var user of ignoredUsers) {
            let row = document.createElement("tr");
            row.style.background = "#8a2424";

            let buttonColumn = document.createElement("td");
            buttonColumn.style.width = "10px";
            let unignoreButton = document.createElement("a");
            unignoreButton.setAttribute("class", "button block");
            unignoreButton.innerText = "Убрать из игнора";
            unignoreButton.addEventListener("click", function() {
                unignore(this);
            });
            buttonColumn.appendChild(unignoreButton);

            row.innerHTML = "<td><h4 style=\"margin-top: 0.4em\"><a href=\"rupark.com/user/" + user + "\" class=\"userNickname\" style=\"margin-left:20px\">" + user + "</a></h4></td>";
            row.appendChild(buttonColumn);
            tbody.appendChild(row);
        }

        tabs.parentElement.appendChild(table);
    });
}

function addIgnoreButton(nickname) {
    let userInfo = document.getElementsByClassName("inputform-m");

    if (userInfo.length != 0) {
        let ignoreButton = document.createElement("a");
        ignoreButton.setAttribute("class", "button");

        if (GM_getValue("ignore_" + nickname, null) != null) {
            ignoreButton.innerText = "Убрать из игнора";
        } else {
            ignoreButton.innerText = "Добавить в игнор";
        }

        userInfo[0].children[0].children[0].lastElementChild.firstElementChild.append(ignoreButton);

        ignoreButton.addEventListener("click", function() {
            if (GM_getValue("ignore_" + nickname, null) != null) {
                GM_deleteValue("ignore_" + nickname);
                ignoreButton.innerText = "Добавить в игнор";
            } else {
                GM_setValue("ignore_" + nickname, 0);
                ignoreButton.innerText = "Убрать из игнора";
            }
        });

    }
}

function modifyNicknames() {
    for (var node of document.getElementsByClassName("url fn nickname")) {
            if (node.innerText == "Zefir4eG") {
                modifyNickname(node, "#FFC0CB", "https://image.flaticon.com/icons/png/128/862/862724.png");
            }

            if (node.innerText == "Нейтральный Джим") {
                modifyNickname(node, null, "https://image.flaticon.com/icons/svg/138/138533.svg");
            }
    }
}

function handleComments() {
    let comments = document.getElementsByClassName("ps comment");
    let ignoredUsers = GM_listValues().filter(str => str.startsWith("ignore_"))
                                          .map(str => str.substring(7));

    var comment = comments[0];

    while (comment != undefined && comment != null && comment.className == "ps comment") {
        if (comment.getElementsByClassName("url fn nickname").length == 0) {
            console.log(comment);
        }

        var author = comment.getElementsByClassName("url fn nickname")[0].getAttribute("title");
        var offset = Number(comment.style.marginLeft.slice(0, -2));

        if (ignoredUsers.includes(author)) {
            comment.style.display = "none";
            comment = comment.nextElementSibling

            while (comment != null && Number(comment.style.marginLeft.slice(0, -2)) > offset) {
                comment.style.display = "none";
                comment = comment.nextElementSibling;
            }
        } else {
            comment = comment.nextElementSibling;
        }
    }
}

/**
 * Helper function for adding listeners on links to topic
 */
function addLinkListeners(topicNode, numericId, commentCount) {
    for (let link of topicNode.getElementsByTagName('a')) {
        if (link.href.match(numericId) != null) {
            link.addEventListener("click", function() {
                GM_setValue(topicNode.id, commentCount);
            });
        }
    }
}

function handleTopics() {
    let topics = document.getElementsByClassName("ps hentry blogs");
    let ignoredUsers = GM_listValues().filter(str => str.startsWith("ignore_"))
                                      .map(str => str.substring(7));

    let trackedTopics = GM_listValues().filter(str => str.startsWith("top"));

    // Tracking comment numbers of topics up to week old.
    let importanceTreshold = new Date();
    importanceTreshold.setDate(importanceTreshold.getDate() - 7);

    for (let topic of topics) {
        let author = topic.getElementsByClassName("url fn nickname")[0].getAttribute("title");
        let datePublished = parseDate(topic.getElementsByClassName("published updated")[0].innerText);
        let numericId = topic.id.substring(3);

        let entryInfoNode = topic.getElementsByClassName("panel entry-info")[0]
        let commentCountStr = entryInfoNode.lastElementChild.previousSibling.nodeValue;
        let commentCount = parseInt(commentCountStr.substring(2, commentCountStr.length - 1));

        let entryTitleNode = topic.getElementsByClassName("entry-title")[0];

        if (trackedTopics.includes(topic.id)) {
            if (datePublished < importanceTreshold) {
                GM_deleteValue(topic.id);
            } else if (GM_getValue(topic.id) < commentCount) {

                // Add amount of new comments
                let newCommentCount = document.createElement("b");
                newCommentCount.innerText = "+" + (commentCount - GM_getValue(topic.id));
                newCommentCount.style.color = GREEN;
                newCommentCount.style.marginLeft = "4px";
                newCommentCount.style.fontSize = "small";

                newCommentCount.addEventListener("mouseover", function() {
                    this.style.display = "none";
                    GM_setValue(topic.id, commentCount);
                });

                entryInfoNode.insertBefore(newCommentCount, entryInfoNode.lastElementChild);
                addLinkListeners(topic, numericId, commentCount);
            }
        } else if (datePublished > importanceTreshold) {
            let newLabel = document.createElement("b");
            newLabel.innerText = "New!";
            newLabel.style.color = GREEN;
            newLabel.style.marginLeft = "7px";
            newLabel.style.fontSize = "medium";

            newLabel.addEventListener("mouseover", function() {
               this.style.display = "none";
               GM_setValue(topic.id, commentCount); // save current amount of comments
            });

            entryTitleNode.appendChild(newLabel);
            addLinkListeners(topic, numericId, commentCount);
        }

        if (ignoredUsers.includes(author)) {
            topic.style.display = "none";
        }
    }
}

function modifyNickname(node, color, iconSrc) {
    let icon = document.createElement("img");

    icon.setAttribute("src", iconSrc);
    icon.setAttribute("width", "12px");
    icon.setAttribute("height", "auto");
    icon.style.marginBottom = "-1px";
    icon.style.marginRight = "5px";

    node.style.marginLeft = "-73px";
    node.insertBefore(icon, node.firstChild);

    if (color != null) {
        node.style.color = color;
    }
}

function emotes(node) {
    node.innerHTML = node.innerHTML.replace(/(^|\s)pepega($|\s)/g, " <img src=\"https://cdn.frankerfacez.com/emoticon/243789/1\"> ");
    node.innerHTML = node.innerHTML.replace(/(^|\s)peepoClown($|\s)/g, " <img src=\"https://cdn.frankerfacez.com/emoticon/318914/1\"> ");
    node.innerHTML = node.innerHTML.replace(/(^|\s)zeroClown($|\s)/g, "<img src=\"https://i.postimg.cc/cJ5qkH4w/zero-Clown.png\" width=\"32px\">");

    return node;
}

function words(node) {
    words = node.innerHTML.split(".")
                          .map(sentence => sentence.split(",")
                                                   .map(words => words.split(" ")
                                                                      .map(word => (word.hashCode() == 1645808550 ||
                                                                                    word.hashCode() == -984505466 ||
                                                                                    word.hashCode() == -984501626 ||
                                                                                    word.hashCode() == 1645812390 ||
                                                                                    word.hashCode() == 1271192267) ? "<b style=\"color:" + randomColor() + "\">петух</b>" : word)
                                                                      .join(" "))
                                                   .join(","))
                          .join(".");

    node.innerHTML = words;

    return node;
}

detectUser();
modifyNavigationBar();
addJumpToTopPanel();
modifyNicknames();

wrapRelevantText();

let text = Array.from(document.getElementsByClassName("relevant-text"))
                .map(words)
                .map(emotes);

if (window.location.href.match(/https:\/\/rupark.com\/user\/.*/) != null) {
    let nickname = document.getElementsByClassName("item vcard fn nickname")

    if (nickname.length != 0) {
        if (nickname[0].innerText == USERNAME) {
            addIgnoredUsersTab();
        } else {
            addIgnoreButton(nickname[0].innerText);
        }
    }
} else if (window.location.href.match(/https:\/\/rupark.com\/topic[0-9]+/) != null) {
    handleComments();
} else if (window.location.href.match(/https:\/\/rupark.com\/blog.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/[0-9]*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/all.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/news.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/topics.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/clans.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/personal.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/sandbox.*/) != null ||
           window.location.href.match(/https:\/\/rupark.com\/flood.*/) != null) {
    handleTopics();
}
