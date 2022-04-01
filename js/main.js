$(document).ready(function() {
  // Empty deck
  var deck = [];
  // Dictionary array
  var wordlist = [];
  // Hand array
  var hand = [];
  // Integer tracking number of words spelled
  var wordsSpelled = 0;
  // String of words
  var scrib = "";

  // Preload background music
  var bgm;
  $.get( "aud/bgm.mp3", function() {
    bgm = new Howl({
      src: ["aud/bgm.mp3"],
      volume: 0.2,
      loop: true
    });
    bgm.play();
  });

  // Preload click sound effect
  var clickSFX;
  $.get( "aud/button.wav", function() {
    clickSFX = new Howl({
      src: ["aud/button.wav"],
      volume: 0.5
    });
  });

  // Preload error sound effect
  var errorSFX;
  $.get( "aud/wrong.wav", function() {
    errorSFX = new Howl({
      src: ["aud/wrong.wav"],
      volume: 0.3
    });
  });

  // Preload game over sound effect
  var gameOverSFX;
  $.get( "aud/gameover.wav", function() {
    gameOverSFX = new Howl({
      src: ["aud/gameover.wav"],
      volume: 0.5
    });
  });

  // Function for drawing cards
  function draw(number) {
    // Declare empty array of cards drawn
    var drawSet = [];
    // Save length of deck array
    var deckLength = deck.length;

    // Do not draw if there are no cards left in the deck array
    if (deckLength <= 0) {
      $("#log").html("No cards left in deck. Cannot draw more.<br />" +  $("#log").html());
    }
    // Draw all remaining cards if number of cards requested is more than the number of cards left in the deck array
    else if ((deckLength - number) >= 0) {
      for(let i = 0; i < number; i++) {
        drawSet[i] = deck.shift();
      };
      $("#log").html("Drew " + String(drawSet.length) + " cards from your deck: " + drawSet.join(", ") + ".<br />" +  $("#log").html());
    }
    // Draw number of cards requested otherwise
    else {
      for(let i = 0; i < deckLength; i++) {
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
    $("#log").html("<span style='color: orange'>Shuffled deck.</span><br /><br />" + $("#log").html());
    // Draw 7 new cards and update deck and hand arrays
    $("#display").html(draw(7).join(" "));
    hand = $("#display").html().replace(/\s+/g, '').split("");
    $("#shuffle").prop("disabled", true);
    console.log(deck);
  };

  function submitWord() {
    // Update hand array
    hand = $("#display").html().replace(/\s+/g, "").split("");
    // Set first letter requirement
    var letterReq = $("#lastLetter").html();
    // Save value of textbox content as a string
    var rawText = $("#textBox").val().replace(/\s+/g, '').toUpperCase();
    // Add the first letter requirement to input string
    var text = letterReq + rawText;
    // Split string "text" into an array
    var arr = rawText.split("");
    // Clone the hand array temporarily
    var tempHand = hand;
    // Index of letter in word; -1 is default, meaning the word does not contain the letter
    var index = -1;
    // The input is considered valid by default
    var valid = true;

    // Invalidate input if it is longer than 7 characters
    if (arr.length > 7) {
      // Play sound effect
      errorSFX.play();
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but you used more than 7 characters.</span><br /><br />" + $("#log").html());
    }
    // Ignore input if it is empty
    else if (arr.length <= 0) {
      return 0;
    }
    // Invalidate input if it is not a valid word in the loaded dictionary
    else if ($.inArray(text, wordlist) === -1) {
      // Play sound effect
      errorSFX.play();
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but it is not a valid word.</span><br /><br />" + $("#log").html());
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
          // Play sound effect
          errorSFX.play();
          $("#log").html("<span style='color: red'>Tried to submit " + text + ", but there are not enough " + arr[i] + " cards in your hand.</span><br /><br />" + $("#log").html());
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
        // Play sound effect
        clickSFX.play();
        // Set the next letter requirement
        $("#lastLetter").html(text.slice(-1));
        $("#lastLetter").css("display", "flex");
        // Add 1 to words spelled
        wordsSpelled++;
        // Add to string of all words spelled
        scrib += rawText;
        // Re-enable shuffle button
        $("#shuffle").prop("disabled", false);
        // Clear text box
        $("#textBox").val("");
        // Print to game log
        $("#log").html("<span style='color: green'>Submitted word " + text + ".</span><br /><br />" + $("#log").html());
        // Draw new cards to replace the ones used
        $("#display").html(tempHand.join(" ") + " " + draw(7 - tempHand.length).join(" "));
        // Update number of cards left in deck
        $("#deckCount").html(String(deck.length));
        // Explain mechanic
        if (letterReq == "") {
          $("#log").html(
            `<div style='text-align:center;'>
              Now, use the <span style='color:orange'>last</span> letter of your last word as the <span style='color:orange'>first</span> letter in your next. You will not need to use another card.<br/>
            <br /></div>`
            + $("#log").html()
          );
        }
        // Disable text box if both deck and hand are empty
        if ($("#display").html().replace(/\s+/g, '').split("").length <= 0 && deck.length <= 0) {
          $(".gameButton").prop("disabled", true);
          $("#textBox").prop("disabled", true);
          $("#log").html(
            `<div style='text-align:center;'>
              <span style='color:red'>Congratulations!</span><br/>
              You used up all the cards in your deck.<br />
              Your full Scrib: `
              + scrib +
              `<br />
              Words spelled: `
              + String(wordsSpelled) +
              `<br />
              Refresh the page to try again.<br />
            </div><br />`
            + $("#log").html()
          );
        };
      };
    };
  };

  // Load dictionary from dict.txt
  $.get( "https://lowestofthe1ow.github.io/scrib/dict.txt", function( txt ) {
    $("#log").html("Loaded successfully!<br />" + $("#log").html());

    // Split dict.txt into an array
    wordlist = txt.split( "\n" );
    console.log(wordlist);

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
        // Play sound effect
        clickSFX.play();
        deck = deck.concat($("#display").html().replace(/\s+/g, '').split(""));
        shuffle();
      }
    );
    // Add event listener to end game when the "give up" button is clicked
    $("#giveup").click(
      function(){
        // Play sound effect
        gameOverSFX.play();
        $(".gameButton").prop("disabled", true);
        $("#textBox").prop("disabled", true);
        // Stop background music
        bgm.stop();
        $("#log").html(
          `<div style='text-align:center;'>
            <span style='color:red'>Game over!</span><br/>
            Cards left in deck: `
            + String(deck.length) +
            `<br />
            Your full Scrib: `
            + scrib +
            `<br />
            Words spelled: `
            + String(wordsSpelled) +
            `<br />
            Refresh the page to try again.<br />
          </div><br />`
          + $("#log").html()
        );
      }
    );

    // Enable all buttons
    $(".gameButton").prop("disabled", false);
    $("#log").html(
      `<div style='text-align:center;'>
        The large letters shown on screen are the <span style='color: orange'>cards</span> in your <span style='color: orange'>hand</span>.<br />
        Type in a word that uses only these letters; you may not use a card more than once.<br/>
        Click <span style='color: green'>Submit</span> or press Enter to submit your input.<br/>
        Click <span style='color: orange'>Shuffle</span> to shuffle your cards.<br/>
        Click <span style='color: red'>Give up</span> to end the game.<br/>
      </div><br />`
      + $("#log").html()
    );
  });
});
