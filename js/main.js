window.onload = function() {
  var deck = [];
  var wordlist = [];
  const cardDisplay = document.getElementById("display");
  const deckCount = document.getElementById("deckCount");
  const textBox = document.getElementById("textBox");
  const log = document.getElementById("log");
  const submit = document.getElementById("submit");
  const shuffleButton = document.getElementById("shuffle");

  function draw(number) {
    drawSet = [];
    var deckLength = deck.length;
    if (deckLength <= 0) {
      log.innerHTML = "No cards left in deck. Cannot draw more.<br />" +  log.innerHTML;
    } else if ((deckLength - number) >= 0) {
      for(i = 0; i < number; i++) {
        drawSet[i] = deck.shift();
      };
      log.innerHTML = "Drew " + String(drawSet.length) + " cards from your deck: " + drawSet.join(", ") + ".<br />" +  log.innerHTML;
    } else {
      console.log(deck.length);
      for(i = 0; i < deckLength; i++) {
        drawSet[i] = deck.shift();
      };
      console.log(drawSet);
      log.innerHTML = "Drew " + String(drawSet.length) + " cards from your deck: " + drawSet.join(", ") + ".<br />" +  log.innerHTML;
    };
    return drawSet;
  }

  function submitWord() {
    var hand = cardDisplay.innerHTML.replace(/\s+/g, '').split("");
    var arr = textBox.value.replace(/\s+/g, '').split("");
    var tempHand = hand;
    var index = -1;
    var valid = true;
    if (arr.length > 7) {
      log.innerHTML = "<span style='color: red'>Tried to submit " + textBox.value + ", but it is longer than 7 characters.</span><br />" + log.innerHTML;
    } else if (arr.length <= 0) {
      return 0;
    } else if ($.inArray(textBox.value, wordlist) === -1) {
      log.innerHTML = "<span style='color: red'>Tried to submit " + textBox.value + ", but it is not a valid word.</span><br />" + log.innerHTML;
      return 0;
    } else {
      for (i = 0; i < arr.length; i++) {
        index = tempHand.findIndex(function(x) {return x == arr[i]});
        if (index == -1) {
          log.innerHTML = "<span style='color: red'>Tried to submit " + textBox.value + ", but there are not enough " + arr[i] + " cards in your hand.</span><br />" + log.innerHTML;
          valid = false;
          break;
        } else {
          tempHand.splice(index, 1);
        }
      }
      if (valid == true) {
        log.innerHTML = "<span style='color: green'>Submitted word " + textBox.value + ".</span><br />" + log.innerHTML;
        textBox.value = "";
        cardDisplay.innerHTML = tempHand.join(" ");
        cardDisplay.innerHTML += " " + draw(7 - tempHand.length).join(" ");
        deckCount.innerHTML = String(deck.length);
        if (cardDisplay.innerHTML.replace(/\s+/g, '').split("").length <= 0 && deck.length <= 0) {
          textBox.disabled = true;
        }
      }
    }
  }

  function shuffle() {
    deck = deck.sort(() => Math.random() - 0.5);
    log.innerHTML = "<span style='color: orange'>Shuffled deck.</span><br />" + log.innerHTML;
    cardDisplay.innerHTML = draw(7).join(" ");
    console.log(deck);
  }

  $.get( "dict.txt", function( txt ) {
    wordlist = txt.split( "\r\n" );

    // Initialize
    log.innerHTML = "Loaded!<br />" +  log.innerHTML;
    shuffleButton.disabled = false;
    submit.disabled = false;

    // Generate deck
    const distribution = [
      ["A", 9],
      ["B", 2],
      ["C", 2],
      ["D", 4],
      ["E", 12],
      ["F", 2],
      ["G", 3],
      ["H", 2],
      ["I", 9],
      ["J", 1],
      ["K", 1],
      ["L", 4],
      ["M", 2],
      ["N", 6],
      ["O", 8],
      ["P", 2],
      ["Q", 1],
      ["R", 6],
      ["S", 4],
      ["T", 6],
      ["U", 4],
      ["V", 2],
      ["W", 2],
      ["X", 1],
      ["Y", 2],
      ["Z", 1]
    ]
    var deckPosition = 0
    deck.length = 98;
    for (i = 0; i < distribution.length; i++) {
      deck = deck.fill(distribution[i][0], deckPosition, deckPosition + distribution[i][1]);
      deckPosition += distribution[i][1];
    }
    shuffle();
    deckCount.innerHTML = String(deck.length);

    submit.addEventListener("click", function(){submitWord()});
    shuffleButton.addEventListener("click", function(){
      deck = deck.concat(cardDisplay.innerHTML.replace(/\s+/g, '').split(""));
      shuffle()
    });
  });
};
