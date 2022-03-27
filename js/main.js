$(document).ready(function() {
  // Empty deck
  var deck = [];
  // Dictionary array
  var wordlist = [];
  // Hand array
  var hand = [];

  // Function for drawing cards
  function draw(number) {
    // Declare empty array of cards drawn
    drawSet = [];
    // Save length of deck array
    var deckLength = deck.length;

    // Do not draw if there are no cards left in the deck array
    if (deckLength <= 0) {
      $("#log").html("No cards left in deck. Cannot draw more.<br />" +  $("#log").html());
    }
    // Draw all remaining cards if number of cards requested is more than the number of cards left in the deck array
    else if ((deckLength - number) >= 0) {
      for(i = 0; i < number; i++) {
        drawSet[i] = deck.shift();
      };
      $("#log").html("Drew " + String(drawSet.length) + " cards from your deck: " + drawSet.join(", ") + ".<br />" +  $("#log").html());
    }
    // Draw number of cards requested otherwise
    else {
      for(i = 0; i < deckLength; i++) {
        drawSet[i] = deck.shift();
      };
      $("#log").html("Drew " + String(drawSet.length) + " cards from your deck: " + drawSet.join(", ") + ".<br />" +  $("#log").html());
    };
    // Return array of drawn cards
    return drawSet;
  };

  // Shuffle function
  function shuffle() {
    // Shuffle deck array
    deck = deck.sort(() => Math.random() - 0.5);
    // Log to game
    $("#log").html("<span style='color: orange'>Shuffled deck.</span><br />" + $("#log").html());
    // Draw 7 new cards and update deck and hand arrays
    $("#display").html(draw(7).join(" "));
    hand = $("#display").html().replace(/\s+/g, '').split("");
    console.log(deck);
  };

  function submitWord() {
    // Update hand array
    hand = $("#display").html().replace(/\s+/g, '').split("");
    // Save value of textbox content as a string
    var text = $("#textBox").val().toUpperCase();
    // Split string of textbox content into an array
    var arr = text.replace(/\s+/g, '').split("");
    // Clone the hand array temporarily
    var tempHand = hand;
    // Index of letter in word; -1 is default, meaning the word does not contain the letter
    var index = -1;
    // The input is considered valid by default
    var valid = true;

    // Invalidate input if it is longer than 7 characters
    if (arr.length > 7) {
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but it is longer than 7 characters.</span><br />" + $("#log").html());
    }
    // Ignore input if it is empty
    else if (arr.length <= 0) {
      return 0;
    }
    // Invalidate input if it is not a valid word in the loaded dictionary
    else if ($.inArray(text, wordlist) === -1) {
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but it is not a valid word.</span><br />" + $("#log").html());
      return 0;
    }
    // If input passes all the above tests, check if it is possible to create with the cards in hand
    else {
      // Loop through each character in the input
      for (let i = 0; i < arr.length; i++) {
        // Look for index of the input's ith character in the cloned array of cards in hand
        index = tempHand.findIndex(function(x) {return x == arr[i]});
        // Invalidate input if it does not exist
        if (index == -1) {
          $("#log").html("<span style='color: red'>Tried to submit " + text + ", but there are not enough " + arr[i] + " cards in your hand.</span><br />" + $("#log").html());
          valid = false;
          break;
        }
        // Remove element from cloned array as each card cannot be used more than once
        else {
          tempHand.splice(index, 1);
        };
      };
      // After confirming that the input is valid, update displays
      if (valid == true) {
        // Clear text box
        $("#textBox").val("");
        // Print to game log
        $("#log").html("<span style='color: green'>Submitted word " + text + ".</span><br />" + $("#log").html());
        // Draw new cards to replace the ones used
        $("#display").html(tempHand.join(" ") + " " + draw(7 - tempHand.length).join(" "));
        // Update number of cards left in deck
        $("#deckCount").html(String(deck.length));
        // Disable text box if both deck and hand are empty
        if ($("#display").html().replace(/\s+/g, '').split("").length <= 0 && deck.length <= 0) {
          $("#textBox").prop("disabled", true);
        };
      };
    };
  };

  // Load dictionary from dict.txt
  $.get( "https://lowestofthe1ow.github.io/card-game-test/dict.txt", function( txt ) {
    // Split dict.txt into an array
    wordlist = txt.split( "\n" );
    console.log(wordlist);

    // Initialize
    $("#log").html("Loaded!<br />" + $("#log").html());
    $("#shuffle").prop("disabled", false);
    $("#submit").prop("disabled", false);

    // Set card distribution in deck
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
    ];
    // Calculate total deck length
    for (let i = 0; i < distribution.length; i++) {
      deck.length += distribution[i][1];
    };
    // Generate and shuffle deck
    var deckPosition = 0;
    for (let i = 0; i < distribution.length; i++) {
      deck = deck.fill(distribution[i][0], deckPosition, deckPosition + distribution[i][1]);
      deckPosition += distribution[i][1];
    };
    shuffle();
    // Update number of cards left in deck
    $("#deckCount").html(String(deck.length));
    // Add event listener to submit input when the "submit" button is clicked
    $("#submit").click(
      function(){
        submitWord();
      }
    );
    // Add event listener to return cards in hand to the deck and shuffle them when the "shuffle" button is clicked
    $("#shuffle").click(
      function(){
        deck = deck.concat($("#display").html().replace(/\s+/g, '').split(""));
        shuffle();
      }
    );
  });
});
