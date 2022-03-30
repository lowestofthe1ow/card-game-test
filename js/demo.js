// Import functions from Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, setDoc, doc, updateDoc, arrayUnion, onSnapshot, getDoc, increment, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// On document load
$(document).ready(function() {
  // Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyBMHk8PXLlcJ89jeLh0lLaou4JZ2kbNkys",
    authDomain: "scrib-f27a9.firebaseapp.com",
    projectId: "scrib-f27a9",
    storageBucket: "scrib-f27a9.appspot.com",
    messagingSenderId: "560951682267",
    appId: "1:560951682267:web:a1ddf3633a1f31b5edd8fe",
    measurementId: "G-3WPBN5QT4G"
  };

  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // ---------- Strings ----------
  // Hosted or joined game ID
  var generatedGameID = "";
  // Inputted name
  var inputtedName = "";
  // Last letter of the previous submitted word
  var lastLetter = "";

  // ---------- Arrays ----------
  // Empty deck
  var deck = [];
  // Dictionary array
  var wordlist = [];
  // List of words submitted by all players
  var submittedWords = [];
  // Hand array
  var hand = [];
  // List of other players upon joining the room
  var otherPlayersOnJoin = [];
  // Array of players to be sorted when determining turn order
  var playerOrder = [];

  // ---------- Integers ----------
  // Integer tracking number of words spelled
  var wordsSpelled = 0;
  // Integer tracking of turn number
  var turn = 0;
  // Integer tracking of times a player has shuffled, used to update Firestore
  var timesShuffled = 0;
  // Integers tracking of times a player has passed, used to update Firestore
  var timesPassed = 0;
  // Integer value equal to total number of cards at the start of the game
  var totalCards = 0;

  // ---------- Bools ----------
  // Whether room has started the game or not
  var inProgress = false;
  // Player has drawn their starting hand
  var drawnStartingHand = false;
  // Turn order has been calculated, but not yet printed
  var decidedTurnOrder = false;
  // Turn order has been printed, but game has not yet started
  var printedTurnOrder = false;
  // Game has been started
  var startedGame = false;
  // The player is allowed to pass; they cannot pass twice in a row
  var passReady = true;

  // Function for drawing cards
  function draw(number) {
    // Declare empty array of cards drawn
    var drawSet = [];
    // Save length of deck array so it is not affected by drawing
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

  // Function for shuffling
  function shuffle() {
    // Shuffle deck array
    deck = deck.sort(() => Math.random() - 0.5);
    // Log to game
    $("#log").html("<span style='color: orange'>Shuffled deck.</span><br /><br />" + $("#log").html());
    // Draw 7 new cards and update deck and hand arrays
    $("#display").html(draw(7).join(" "));
    // Update hand variable
    hand = $("#display").html().replace(/\s+/g, '').split("");
  };

  // Function for submitting and validating words
  function submitWord() {
    // Update hand array
    hand = $("#display").html().replace(/\s+/g, "").split("");
    // Save value of textbox content as a string
    var rawText = $("#textBox").val().replace(/\s+/g, '').toUpperCase();
    // Add the first letter requirement to input string
    var text = lastLetter + rawText;
    // Split string "rawText" into an array
    var arr = rawText.split("");
    // Clone the hand array temporarily
    var tempHand = hand;
    // Index of letter in word; -1 is default, meaning the word does not contain the letter
    var index = -1;
    // The input is considered valid by default
    var valid = true;

    // Invalidate input if it is longer than 7 characters
    if (arr.length > 7) {
      // Log to game
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but you used more than 7 characters.</span><br /><br />" + $("#log").html());
    }
    // Ignore input if it is empty
    else if (arr.length <= 0) {
      return 0;
    }
    // Invalidate input if it is not a valid word in the loaded dictionary
    else if ($.inArray(text, wordlist) === -1) {
      // Log to game
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but it is not a valid word.</span><br /><br />" + $("#log").html());
      return 0;
    }
    // If input passes all the above tests, check if it is possible to create with the cards in hand
    else {
      // Loop through each character in the input
      for (let i = 0; i < arr.length; i++) {
        // Look for index of the input's ith character in the cloned array of cards in hand
        index = tempHand.findIndex(function(x) {return x == arr[i]});
        // Invalidate input if ith character does not exist in cloned array
        if (index == -1) {
          $("#log").html("<span style='color: red'>Tried to submit " + text + ", but there are not enough " + arr[i] + " cards in your hand.</span><br /><br />" + $("#log").html());
          valid = false;
          break;
        }
        // Otherwise, remove element from cloned array as each card cannot be used more than once
        else {
          tempHand.splice(index, 1);
        };
      };
      // After confirming that the input is valid, update displays
      if (valid == true) {
        // Enable the pass button
        passReady = true;
        // Add 1 to words spelled
        wordsSpelled++;
        // Clear text box
        $("#textBox").val("");
        // Log to game
        $("#log").html("<span style='color: green'>Submitted word " + text + ".</span><br /><br />" + $("#log").html());
        // Draw new cards to replace the ones used
        $("#display").html(tempHand.join(" ") + " " + draw(7 - tempHand.length).join(" "));
        // Update number of cards left in deck
        $("#deckCount").html(String(deck.length));
        // Update Firestore
        sendWordToFirestore(text);
      };
    };
  };

  // Function to add players to turnOrder array in Firestore
  async function setTurnOrder() {
    await updateDoc(doc(db, "games", generatedGameID), {
      turnOrder: arrayUnion(hand.join("") + inputtedName),
    });
  };

  // Function to shuffle the turn order and update Firestore
  async function shuffleTurnOrder(array) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turnOrder: array.sort().map(s => s.slice(1)),
    });
  };

  // Function to increment turn number in Firestore
  async function incrementTurn(number, type) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turn: number,
      numberQuit: increment(type)
    });
  };

  // Function for updating Firestore after shuffling
  async function broadcastShuffle() {
    await updateDoc(doc(db, "games", generatedGameID), {
      timesShuffled: increment(1)
    });
  };

  // Function for updating Firestore after passing
  async function broadcastPass() {
    await updateDoc(doc(db, "games", generatedGameID), {
      timesPassed: increment(1)
    });
  };

  // Function for updating Firestore after giving up
  async function broadcastGiveUp() {
    var playerScore = {
      name: inputtedName,
      score: totalCards - deck.length - $("#display").html().replace(/\s+/g, '').split("").length
    }
    await updateDoc(doc(db, "games", generatedGameID), {
      inputtedNames: arrayRemove(inputtedName),
      scores: arrayUnion(playerScore)
    });
  };

  // Function for deleting the Firestore document when game is over
  async function deleteFirestore() {
    await deleteDoc(doc(db, "games", generatedGameID));
  };

  // Function for sending submitted word to Firestore
  async function sendWordToFirestore(word) {
    // Get Firestore document
    let firestoreDoc = await getDoc(doc(db, "games", generatedGameID));
    // If the Firestore document exists, update Firestore array
    if (firestoreDoc.exists()) {
      // Add submitted word to Firestore words array
      let arrayWords = firestoreDoc.data().words;
      arrayWords.push(word);
      await updateDoc(doc(db, "games", generatedGameID), {
        words: arrayWords,
      });
    }
    // If it does not exist, log to game
    else {
      $("#log").html("<span style='color:red'>Failed to get Firestore document.</span><br /><br />");
    };
  };

  // Function for initializing the game
  async function initializeGame(type) {
    // Automatically give up when closing the window
    $(window).bind('beforeunload', function(){
      broadcastGiveUp();
    });

    // Callback function when dictionary is loaded
    $.get( "https://lowestofthe1ow.github.io/scrib/dict.txt", async function( txt ) {
      $("#log").html("Loaded successfully!<br />" + $("#log").html());
      // Split dict.txt into an array
      wordlist = txt.split( "\n" );
      // Set card distribution in deck
      const distribution = [
        ["A", 5],
        ["B", 1],
        ["C", 1],
        ["D", 2],
        ["E", 6],
        ["F", 1],
        ["G", 2],
        ["H", 1],
        ["I", 5],
        ["J", 1],
        ["K", 1],
        ["L", 2],
        ["M", 1],
        ["N", 3],
        ["O", 4],
        ["P", 1],
        ["Q", 1],
        ["R", 3],
        ["S", 2],
        ["T", 3],
        ["U", 2],
        ["V", 1],
        ["W", 1],
        ["X", 1],
        ["Y", 1],
        ["Z", 1]
      ];
      // Calculate total deck length
      for (let i = 0; i < distribution.length; i++) {
        deck.length += distribution[i][1];
      };
      // Set totalCards to length of deck array
      totalCards = deck.length;
      // Generate and shuffle deck
      var deckPosition = 0;
      for (let i = 0; i < distribution.length; i++) {
        deck = deck.fill(distribution[i][0], deckPosition, deckPosition + distribution[i][1]);
        deckPosition += distribution[i][1];
      };

      // Add event listener to submit input when the "submit" button is clicked
      $("#submit").click(
        function(){
          submitWord();
        }
      );
      // Add event listener to return cards in hand to the deck and shuffle them when the "shuffle" button is clicked
      $("#shuffle").click(
        function(){
          // Update deck variable
          deck = deck.concat($("#display").html().replace(/\s+/g, '').split(""));
          // Shuffle and disable shuffle button
          shuffle();
          broadcastShuffle();
          $("#shuffle").prop("disabled", true);
        }
      );
      // Add event listener to pass turn when the "pass" button is clicked
      $("#pass").click(
        function(){
          // Log to game
          $("#log").html("<span style='color:orange'>You passed your turn.</span><br /><br />" + $("#log").html());
          // Pass and disable pass button
          broadcastPass();
          $("#pass").prop("disabled", "true");
          passReady = false;
        }
      );
      // Add event listener to end game when the "give up" button is clicked
      $("#giveup").click(
        function(){
          // Give up and disable all buttons
          broadcastGiveUp();
          $(".gameButton").prop("disabled", true);
          $("#textBox").prop("disabled", true);
          // If player is not the last player in-game, log a message to game
          if (playerOrder.length > 1) {
            $("#log").html(
              `<div style='text-align:center;'>
                <span style='color:red'>You gave up!</span><br/>
                Waiting for other players...
              </div><br />`
              + $("#log").html()
            );
          };
        }
      );
      // Add event listener to start game when host clicks "Ready"
      $("#readyButton").click(
        async function() {
          // Hide the button
          $("#readyButton").css("display", "none");
          inProgress = true;
          // Update Firestore
          await updateDoc(doc(db, "games", generatedGameID), {
            inProgress: true,
            turn: turn
          });
        }
      );
      // Log the room ID to the game
      $("#log").html(
        "<div style='text-align:center;'>" +
          "Game ID: <span style='color:orange'>" + generatedGameID + "</span></div><br />" +
        $("#log").html()
      );
      // If the player is hosting, initialize room
      if (type === "host") {
        $("#log").html(
          "<div style='text-align:center;'>" +
            "Welcome, " + inputtedName + ".<br />Wait until there are at least 2 players in the room before starting the game.</div><br />" +
          $("#log").html()
        );
        await setDoc(doc(db, "games", generatedGameID), {
          inputtedNames: [inputtedName],
          words: [],
          turn: 0,
          inProgress: false,
          turnOrder: [],
          timesShuffled: 0,
          timesPassed: 0,
          numberQuit: 0,
          scores: []
        });
      }
      // If the player is joining an existing room, update databases
      else if (type === "join") {
        $("#log").html(
          "<div style='text-align:center;'>" +
            "Welcome, " + inputtedName + ".<br />Wait for the host to start the game.<br />Other people in the room:<br /><span style='color:yellow'>" +
            otherPlayersOnJoin.join("</span>, <span style='color:yellow'>") +
            "</span></div><br />" +
          $("#log").html()
        );
        await updateDoc(doc(db, "games", generatedGameID), {
          inputtedNames: arrayUnion(inputtedName),
        });
      };
      // Listen for Firestore changes
      var change = onSnapshot(doc(db, "games", generatedGameID), (firestoreDoc) => {
        // If the room has not yet started the game, i.e., whenever a new player joins the room
        if (firestoreDoc.data().inProgress === false) {
          // Add new player to array of player names
          let inputtedNamesArray = firestoreDoc.data().inputtedNames;
          // Log name to game
          let newinputtedName = inputtedNamesArray[inputtedNamesArray.length - 1];
          $("#log").html(
            `<div style='text-align:center;'>
              A player has joined. [` + firestoreDoc.data().inputtedNames.length + `]<br />
              Name: <span style="color:yellow">` + newinputtedName + `</span><br />
            </div><br />` +
            $("#log").html()
          );
          if (firestoreDoc.data().inputtedNames.length === 2 && type === "host") {
            $("#readyButton").prop("disabled", false);
            $("#log").html(
              `<div style='text-align:center;'>
              Click <span style="color:Green">Ready</span> to begin the game!
              </div><br />` +
              $("#log").html()
            );
          };
        }
        // If the room has started the game, i.e., the host has clicked "Ready"...
        else {
          // ...but the room has not yet started the first turn...
          if (startedGame === false) {
            // ...and the player has not yet uploaded their starting hand to Firestore
            if (drawnStartingHand === false) {
              $("#log").html(
                `<div style='text-align:center;'>
                The game has started!
                </div><br />` +
                $("#log").html()
              );
              // Shuffle and upload to Firestore
              shuffle();
              setTurnOrder();
              drawnStartingHand = true;
            };
            // ...but all players have uploaded their starting hand to Firestore
            if(firestoreDoc.data().turnOrder.length === firestoreDoc.data().inputtedNames.length && decidedTurnOrder === false) {
              // Save and compare all starting hands in Firestore to each player and decide turn order
              playerOrder = firestoreDoc.data().turnOrder.sort().map(s => s.slice(7));
              let drawnLetters = firestoreDoc.data().turnOrder.sort().map(s => s.slice(0, 7));

              // Log all starting hands to game
              $("#log").html("<br />" + $("#log").html());
              for (let i = 0; i < playerOrder.length; i++) {
                $("#log").html("<span style='color: yellow'>" + playerOrder[i] + "</span> drew " + drawnLetters[i].split("").join(", ") + ".<br />" + $("#log").html());
              };
              // Log the calculated turn order to game
              $("#log").html("Thus, the turn order will be the following:<br /><span style='color:yellow'>" + playerOrder.join("</span>, <span style='color:yellow'>") + "</span><br /><br />" + $("#log").html());
              // Update number of cards left in deck
              $("#deckCount").html(String(deck.length));
              // Log instructions to game
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
              // Upload calculated turn order to Firestore
              shuffleTurnOrder(firestoreDoc.data().turnOrder);
              startedGame = true;
              decidedTurnOrder = true;
            };
          }
          // ...and the room has started the first turn...
          else if (decidedTurnOrder = true) {
            // ...and the game has not yet logged whose turn it is
            if (printedTurnOrder === false) {
              // If it is not the player's turn, log "It is [Player]'s turn"
              if (playerOrder.indexOf(inputtedName) !== turn) {
                if (playerOrder.length > 1) {
                  $("#log").html("It is <span style='color:yellow'>" + playerOrder[turn] + "</span>'s turn.<br /><br />"+ $("#log").html());
                };
                // Disable all buttons
                $(".gameButton").prop("disabled", true);
                printedTurnOrder = true;
              }
              // Otherwise, if it is the player's turn and there are still cards in their deck, log "It is your turn"
              else if ($("#display").html().replace(/\s+/g, '').split("").length > 0 || deck.length > 0) {
                if (playerOrder.length > 1) {
                  $("#log").html("<span style='color:green'>It is your turn.</span><br /><br />"+ $("#log").html());
                };
                // Enable buttons that should be enabled
                $("#submit").prop("disabled", false);
                $("#giveup").prop("disabled", false);
                if (playerOrder.length > 1) {
                  $("#shuffle").prop("disabled", false);
                };
                if (passReady === true && playerOrder.length > 1) {
                  $("#pass").prop("disabled", false);
                };
                printedTurnOrder = true;
              }
              // Otherwise, pass or give up
              else {
                // If there are still other active players, pass the turn
                if (playerOrder.length > 1) {
                  broadcastPass();
                  // Log to game
                  $("#log").html("<span style='color:green'>You have no more cards in your hand or deck.</span><br /><br />"+ $("#log").html());
                }
                // Otherwise, automatically give up
                else {
                  broadcastGiveUp();
                  // Disable all buttons
                  $(".gameButton").prop("disabled", true);
                  $("#textBox").prop("disabled", true);
                };
              };
            };
            // ...and there is a change in the timesShuffled integer, i.e., a player has shuffled their cards
            if (firestoreDoc.data().timesShuffled !== timesShuffled) {
              // If said player is not the local player, log to game
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> shuffled their cards.<br /><br />"+ $("#log").html());
              };
              // Set local timesShuffled to be equal to the Firestore timesShuffled
              timesShuffled = firestoreDoc.data().timesShuffled;
            }
            // ...and there is a change in the timesPassed integer, i.e., a player has passed
            else if (firestoreDoc.data().timesPassed !== timesPassed) {
              // If said player is not the local player, log to game
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> passed their turn.<br /><br />"+ $("#log").html());
              };
              // Set local timesPassed to be equal to the Firestore timesPassed
              timesPassed = firestoreDoc.data().timesPassed;
              // Update the turn number
              if (turn === playerOrder.length - 1) {
                turn = 0;
              } else {
                turn++;
              };
              incrementTurn(turn, 0);
              printedTurnOrder = false;
            }
            // ...and there is a change in the words array, i.e., a player has submitted a word
            else if (firestoreDoc.data().words.length !== submittedWords.length) {
              // Set local submittedWords to be equal to the Firestore words
              submittedWords = firestoreDoc.data().words;
              // If said player is not the local player, log to game
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> <span style='color:green'>submitted word " + submittedWords[submittedWords.length - 1] + "</span><br /><br />"+ $("#log").html());
              };
              // If the word is the first word submitted, show explanation on the word-chain mechanic
              if (lastLetter === "") {
                $("#log").html(
                  `<div style='text-align:center;'>
                    Now, each player will use the <span style='color:orange'>last</span> letter of the previous player's word as the <span style='color:orange'>first</span> letter in the next. You will not need to use another card for the required letter.<br/>
                  <br /></div>`
                  + $("#log").html()
                );
              };
              // Update the last letter requirement
              lastLetter = submittedWords[submittedWords.length - 1].slice(-1);
              $("#lastLetter").html(lastLetter);
              $("#lastLetter").css("display", "flex");
              // Update the turn number
              if (turn >= playerOrder.length - 1) {
                turn = 0;
              } else {
                turn++;
              };
              incrementTurn(turn, 0);
              printedTurnOrder = false;
            }
            // ...and there is a change in the number of players, i.e., a player has given up
            else if (firestoreDoc.data().inputtedNames.length !== playerOrder.length) {
              // If said player is not the local player, log to game
              if (playerOrder[turn] !== inputtedName) {
                $("#log").html("<span style='color:red'>" + playerOrder[turn] + " gave up.</span><br /><br />"+ $("#log").html());
              }
              // Remove the player who has given up from the local playerOrder array
              playerOrder.splice(turn, 1);
              // If there are no more players left, end the game
              if (playerOrder.length <= 0) {
                // Generate the full Scrib, i.e., the combination of all the submitted words
                let scrib = [firestoreDoc.data().words[0]].concat(firestoreDoc.data().words.slice(1).map(s => s.slice(1)));
                // Sort scores
                let sortedScoresArray = firestoreDoc.data().scores.sort((a, b) => parseFloat(b.score) - parseFloat(a.score));

                // Create a string for printing leaderboard
                let currentRank = 1;
                let printResults = "";
                for (let i = 0; i < sortedScoresArray.length; i++) {
                  printResults += "[" + currentRank + "] <span style='color:yellow'>" + sortedScoresArray[i].name + "</span> (Score: " + sortedScoresArray[i].score + ")<br />";
                  // Give the same rank to equal scores
                  if (i < sortedScoresArray.length - 1 && sortedScoresArray[i].score !== sortedScoresArray[i + 1].score) {
                    currentRank++;
                  };
                };

                // Log game results
                $("#log").html(
                  `<div style='text-align:center;'>
                    <span style='color:red'>Game over!</span><br/>
                    All players have given up.<br /><br />
                    <span style='color:yellow'>Your stats:</span><br />
                    Cards left in deck: `
                    + String(deck.length) +
                    `<br />
                    Words spelled: `
                    + String(wordsSpelled) +
                    `<br />
                    Your full Scrib: `
                    + scrib.join("") +
                    `<br /><br />
                    <span style='color:yellow'>Leaderboard:</span><br />` +
                    printResults +
                  `</div><br />`
                  + $("#log").html()
                );

                // Stop listening for changes
                change();
                // Delete Firestore document
                deleteFirestore();

                // Disable all buttons
                $(".gameButton").prop("disabled", true);
              }
              // Otherwise...
              else {
                // If there is only one player left, change to solo mode or wait for that player
                if (playerOrder.length === 1) {
                  // Reset turn count
                  turn = 0;
                  // If said player is the local player, enter solo mode
                  if (playerOrder[0] === inputtedName) {
                    $("#log").html("<span style='color:green'>You are now the only player left. Play until the end; you are no longer allowed to shuffle or pass.</span><br /><br />"+ $("#log").html());
                    // Enable "Submit" and "Give up"
                    $("#submit").prop("disabled", false);
                    $("#giveup").prop("disabled", false);
                    // Disable "Shuffle" and "Pass turn"
                    $("#shuffle").prop("disabled", true);
                    $("#pass").prop("disabled", true);
                  }
                  // Otherwise, wait for that player to give up
                  else {
                    $("#log").html("<span style='color:yellow'>" + playerOrder[0] + "</span> is now the only player left.<br /><br />"+ $("#log").html());
                    $(".gameButton").prop("disabled", true);
                  };
                  printedTurnOrder = true;
                }
                // Otherwise, update the turn count
                else {
                  if (turn >= playerOrder.length) {
                    turn = 0;
                  };
                  incrementTurn(turn, 1);
                  printedTurnOrder = false;
                };
              };
            };
          };
        };
      });
    });
  };

  // Add event listener for selecting "Host" in the menu
  $("#host").click(
    async function() {
      // Update inputtedName and generatedGameID
      inputtedName = $("#name").val().replace(/\s+/g, "");
      generatedGameID = "id" + Math.random().toString(16).slice(2);
      // If field is empty, ask for a name
      if (inputtedName === "") {
        alert("Please enter your name.");
      }
      // Otherwise, initialize the game
      else {
        $("#startOptions").css("display", "none");
        $("#readyButton").css("display", "inline");
        $("#game").css("display", "block");
        initializeGame("host");
      };
    }
  );

  // Add event listener for selecting "Join" in the menu
  $("#join").click(
    async function() {
      // Update inputtedName and generatedGameID
      inputtedName = $("#name").val().replace(/\s+/g, "");
      generatedGameID = $("#formGameID").val().replace(/\s+/g, "");
      // If name field is empty, ask for a name
      if (inputtedName === "") {
        alert("Please enter your name.")
      }
      // If ID field is empty, ask for an ID
      else if (generatedGameID === "") {
        alert("Please input a game ID.")
      }
      // Otherwise...
      else {
        let firestoreDoc = await getDoc(doc(db, "games", generatedGameID));
        // ...if Firestore document exists, i.e., the ID matches an existing room...
        if (firestoreDoc.exists()) {
          // ...but it is in progress, send an alert
          if (firestoreDoc.data().inProgress === true) {
            alert("This game is in progress.");
          }
          // ...but the  inputted name already exists in the room, send an alert
          else if (firestoreDoc.data().inputtedNames.indexOf(inputtedName) !== -1) {
            alert("This name is taken in that room.");
          }
          // Otherwise, initialize the game
          else {
            $("#startOptions").css("display", "none");
            $("#game").css("display", "block");
            otherPlayersOnJoin = firestoreDoc.data().inputtedNames;
            initializeGame("join");
          };
        }
        else {
          alert("No game with the given ID exists.")
        };
      };
    }
  );
});
