// Import functions from Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";
import { getFirestore, collection, setDoc, doc, updateDoc, arrayUnion, onSnapshot, getDoc, increment, arrayRemove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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
  const analytics = getAnalytics(app);
  const db = getFirestore(app);

  var generatedGameID;
  var inputtedName;

  // Empty deck
  var deck = [];
  // Dictionary array
  var wordlist = [];
  var submittedWords = [];
  // Hand array
  var hand = [];
  // Integer tracking number of words spelled
  var wordsSpelled = 0;
  // String of words
  var scrib = "";
  var playerOrder = [];

  var inProgress = false;
  var startedGame = false;
  var drawnStartingHand = false;
  var decidedTurnOrder = false;
  var turn = 0;
  var printedTurnOrder = false;
  var lastLetter = "";
  var timesShuffled = 0;

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
  };

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
      $("#log").html("<span style='color: red'>Tried to submit " + text + ", but you used more than 7 characters.</span><br /><br />" + $("#log").html());
    }
    // Ignore input if it is empty
    else if (arr.length <= 0) {
      return 0;
    }
    // Invalidate input if it is not a valid word in the loaded dictionary
    else if ($.inArray(text, wordlist) === -1) {
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
        // Add 1 to words spelled
        wordsSpelled++;
        // Add to string of all words spelled
        scrib += rawText;
        // Clear text box
        $("#textBox").val("");
        // Print to game log
        $("#log").html("<span style='color: green'>Submitted word " + text + ".</span><br /><br />" + $("#log").html());
        // Draw new cards to replace the ones used
        $("#display").html(tempHand.join(" ") + " " + draw(7 - tempHand.length).join(" "));
        // Update number of cards left in deck
        $("#deckCount").html(String(deck.length));
        sendWordToFirestore(text);
      };
    };
  };

  async function setTurnOrder() {
    await updateDoc(doc(db, "games", generatedGameID), {
      turnOrder: arrayUnion(hand[0] + inputtedName),
    });
  };

  async function shuffleTurnOrder(array) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turnOrder: array.sort().map(s => s.slice(1)),
    });
  };

  async function incrementTurn(number) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turn: number,
    });
  }

  async function broadcastShuffle() {
    await updateDoc(doc(db, "games", generatedGameID), {
      timesShuffled: increment(1)
    });
  }

  async function broadcastGiveUp() {
    await updateDoc(doc(db, "games", generatedGameID), {
      inputtedNames: arrayRemove(inputtedName)
    });
  }

  async function sendScoreToFirestore() {
    await setDoc(doc(db, "games", generatedGameID), {
      inputtedNames: arrayRemove(inputtedName)
    }, {merge: true});
  }

  // Load dictionary from dict.txt
  async function initializeGame(type) {
    $.get( "https://lowestofthe1ow.github.io/scrib/dict.txt", async function( txt ) {
      $("#log").html("Loaded successfully!<br />" + $("#log").html());

      // Split dict.txt into an array
      wordlist = txt.split( "\n" );

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
          broadcastShuffle();
          $("#shuffle").prop("disabled", true);
        }
      );

      // Add event listener to end game when the "give up" button is clicked
      $("#giveup").click(
        function(){
          broadcastGiveUp();
          $(".gameButton").prop("disabled", true);
          $("#textBox").prop("disabled", true);
          $("#log").html(
            `<div style='text-align:center;'>
              <span style='color:red'>You gave up!</span><br/>
              Cards left in deck: `
              + String(deck.length) +
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

      $("#readyButton").click(
        async function() {
          $("#readyButton").css("display", "none");
          inProgress = true;

          await updateDoc(doc(db, "games", generatedGameID), {
            inProgress: true,
            turn: turn
          });
        }
      );

      if (type === "host") {
        await setDoc(doc(db, "games", generatedGameID), {
          inputtedNames: [inputtedName],
          words: [],
          turn: 0,
          inProgress: false,
          turnOrder: [],
          timesShuffled: 0,
        });
      }
      else if (type === "join") {
        await updateDoc(doc(db, "games", generatedGameID), {
          inputtedNames: arrayUnion(inputtedName),
        });
      };

      const change = onSnapshot(doc(db, "games", generatedGameID), (doc) => {
        if (doc.data().inProgress === false) {
          let inputtedNamesArray = doc.data().inputtedNames;
          let newinputtedName = inputtedNamesArray[inputtedNamesArray.length - 1];
          $("#log").html(
            `<div style='text-align:center;'>
              A player has joined. [` + doc.data().inputtedNames.length + `]<br />
              Name: <span style="color:yellow">` + newinputtedName + `</span><br />
            </div><br />` +
            $("#log").html()
          );
          if (doc.data().inputtedNames.length === 2 && type === "host") {
            $("#readyButton").prop("disabled", false);
            $("#log").html(
              `<div style='text-align:center;'>
              Click <span style="color:Green">Ready</span> to begin the game!
              </div><br />` +
              $("#log").html()
            );
          }
        }
        else {
          if (startedGame === false) {
            if (drawnStartingHand === false) {
              $("#log").html(
                `<div style='text-align:center;'>
                The game has started!
                </div><br />` +
                $("#log").html()
              );
              shuffle();
              setTurnOrder();
              drawnStartingHand = true;
            };

            if(doc.data().turnOrder.length === doc.data().inputtedNames.length && decidedTurnOrder === false) {
              playerOrder = doc.data().turnOrder.sort().map(s => s.slice(1))
              let drawnLetters = doc.data().turnOrder.sort().map(s => s.charAt(0))

              $("#log").html("<br />" + $("#log").html());
              for (let i = 0; i < playerOrder.length; i++) {
                $("#log").html("<span style='color: yellow'>" + playerOrder[i] + "</span> drew " + drawnLetters[i] + " first.<br />" + $("#log").html());
              }

              $("#log").html("Thus, the turn order will be the following:<br /><span style='color:yellow'>" + playerOrder.join("</span>, <span style='color:yellow'>") + "</span><br /><br />" + $("#log").html());
              // Update number of cards left in deck
              $("#deckCount").html(String(deck.length));

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

              shuffleTurnOrder(doc.data().turnOrder);
              startedGame = true;
              decidedTurnOrder = true;
            };
          } else if (decidedTurnOrder = true) {
            if (printedTurnOrder === false) {
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("It is <span style='color:yellow'>" + playerOrder[turn] + "</span>'s turn.<br /><br />"+ $("#log").html());
                $(".gameButton").prop("disabled", true);
                printedTurnOrder = true;
              }
              else {
                $("#log").html("<span style='color:green'>It is your turn.</span><br /><br />"+ $("#log").html());
                $(".gameButton").prop("disabled", false);
                printedTurnOrder = true;
              }
            }

            if (doc.data().timesShuffled !== timesShuffled) {
              $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> shuffled their cards.<br /><br />"+ $("#log").html());
              timesShuffled = doc.data().timesShuffled;
            }
            else if (doc.data().words.length !== submittedWords.length) {
              submittedWords = doc.data().words;

              $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> <span style='color:green'>submitted word " + submittedWords[submittedWords.length - 1] + "</span><br /><br />"+ $("#log").html());

              if (lastLetter === "") {
                $("#log").html(
                  `<div style='text-align:center;'>
                    Now, each player will use the <span style='color:orange'>last</span> letter of the previous player's word as the <span style='color:orange'>first</span> letter in the next. You will not need to use another card for the required letter.<br/>
                  <br /></div>`
                  + $("#log").html()
                );
              };

              lastLetter = submittedWords[submittedWords.length - 1].slice(-1);
              $("#lastLetter").html(lastLetter);
              $("#lastLetter").css("display", "flex");

              if (turn === playerOrder.length - 1) {
                turn = 0;
              } else {
                turn++;
              };
              incrementTurn(turn);
              printedTurnOrder = false;
            }
            else if (doc.data().inputtedNames.length !== playerOrder.length) {
              if (playerOrder[turn] !== inputtedName) {
                $("#log").html("<span style='color:red'>" + playerOrder[turn] + " gave up.</span><br /><br />"+ $("#log").html());
              }
              console.log(playerOrder);
              console.log(turn);
              playerOrder.splice(turn, 1);
              console.log(playerOrder);
              if (playerOrder.length === 1) {
                $("#log").html(
                  `<div style='text-align:center;'>
                    <span style='color:red'>Game over!</span><br/>
                    All players except <span style='color:yellow'>` + playerOrder[0]  + `</span> have given up.<br />
                    Cards left in deck: `
                    + String(deck.length) +
                    `<br />
                    Words spelled: `
                    + String(wordsSpelled) +
                    `<br />
                    Refresh the page to try again.<br />
                  </div><br />`
                  + $("#log").html()
                );
              }
            };
          };
        };
      });

      $("#log").html(
        "<div style='text-align:center;'>" +
          "Game ID: <span style='color:orange'>" + generatedGameID + "</span></div><br />" +
        $("#log").html()
      );
    });
  }

  async function sendWordToFirestore(word) {
    await updateDoc(doc(db, "games", generatedGameID), {
      words: arrayUnion(word),
    });
  };

  $("#host").click(
    async function() {
      inputtedName = $("#name").val().replace(/\s+/g, "");
      generatedGameID = "id" + Math.random().toString(16).slice(2);
      if (inputtedName === "") {
        alert("Please enter your name.")
      }
      else {
        $("#startOptions").css("display", "none");
        $("#readyButton").css("display", "inline");
        $("#game").css("display", "block");
        initializeGame("host", generatedGameID);
      }
    }
  );

  $("#join").click(
    async function() {
      inputtedName = $("#name").val().replace(/\s+/g, "");
      generatedGameID = $("#formGameID").val().replace(/\s+/g, "");
      if (inputtedName === "") {
        alert("Please enter your name.")
      }
      else if (generatedGameID === "") {
        alert("Please input a game ID.")
      }
      else {
        let firestoreData = await getDoc(doc(db, "games", generatedGameID));
        if (firestoreData.exists()) {
          if (firestoreData.data().inProgress === true) {
            alert("This game is in progress.")
          }
          else if (firestoreData.data().inputtedNames.indexOf(inputtedName) !== -1) {
            alert("This name is taken in that room.")
          }
          else {
            $("#startOptions").css("display", "none");
            $("#game").css("display", "block");
            initializeGame("join", generatedGameID);
          }
        }
        else {
          alert("No game with the given ID exists.")
        }
      };
    }
  );
});
