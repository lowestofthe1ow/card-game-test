// Import functions from Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getFirestore, collection, setDoc, doc, updateDoc, arrayUnion, onSnapshot, getDoc, increment, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

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

  var playerOrder = [];

  var inProgress = false;
  var startedGame = false;
  var drawnStartingHand = false;
  var decidedTurnOrder = false;
  var turn = 0;
  var printedTurnOrder = false;
  var lastLetter = "";
  var timesShuffled = 0;
  var timesPassed = 0;
  var shuffleReady = true;
  var passReady = true;

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
        passReady = true;
        shuffleReady = true;
        // Add 1 to words spelled
        wordsSpelled++;
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
      turnOrder: arrayUnion(hand.join("") + inputtedName),
    });
  };

  async function shuffleTurnOrder(array) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turnOrder: array.sort().map(s => s.slice(1)),
    });
  };

  async function incrementTurn(number, type) {
    await updateDoc(doc(db, "games", generatedGameID), {
      turn: number,
      numberQuit: increment(type)
    });
  }

  async function broadcastShuffle() {
    await updateDoc(doc(db, "games", generatedGameID), {
      timesShuffled: increment(1)
    });
  }

  async function broadcastPass() {
    await updateDoc(doc(db, "games", generatedGameID), {
      timesPassed: increment(1)
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

  async function deleteFirestore() {
    await deleteDoc(doc(db, "games", generatedGameID));
  }

  // Load dictionary from dict.txt
  async function initializeGame(type) {
    $(window).bind('beforeunload', function(){
      if (playerOrder.length > 0) {
        return 'Are you sure you want to leave?';
      };
    });
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
          shuffleReady = false;
        }
      );

      // Add event listener to pass turn when the "pass" button is clicked
      $("#pass").click(
        function(){
          $("#log").html("<span style='color:orange'>You passed your turn.</span><br /><br />" + $("#log").html());
          broadcastPass();
          $("#pass").prop("disabled", "true");
          passReady = false;
        }
      );

      // Add event listener to end game when the "give up" button is clicked
      $("#giveup").click(
        function(){
          broadcastGiveUp();
          $(".gameButton").prop("disabled", true);
          $("#textBox").prop("disabled", true);
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
          timesPassed: 0,
          numberQuit: 0
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
              playerOrder = doc.data().turnOrder.sort().map(s => s.slice(7))
              let drawnLetters = doc.data().turnOrder.sort().map(s => s.slice(0, 7))
              console.log(drawnLetters);

              $("#log").html("<br />" + $("#log").html());
              for (let i = 0; i < playerOrder.length; i++) {
                $("#log").html("<span style='color: yellow'>" + playerOrder[i] + "</span> drew " + drawnLetters[i].split("").join(", ") + ".<br />" + $("#log").html());
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
                if (playerOrder.length > 1) {
                  $("#log").html("It is <span style='color:yellow'>" + playerOrder[turn] + "</span>'s turn.<br /><br />"+ $("#log").html());
                };
                $(".gameButton").prop("disabled", true);
                printedTurnOrder = true;
              }
              else if ($("#display").html().replace(/\s+/g, '').split("").length > 0 || deck.length > 0) {
                if (playerOrder.length > 1) {
                  $("#log").html("<span style='color:green'>It is your turn.</span><br /><br />"+ $("#log").html());
                };
                $("#submit").prop("disabled", false);
                $("#giveup").prop("disabled", false);
                if (shuffleReady === true && playerOrder.length > 1) {
                  $("#shuffle").prop("disabled", false);
                };
                if (passReady === true && playerOrder.length > 1) {
                  $("#pass").prop("disabled", false);
                };
                printedTurnOrder = true;
              }
              else {
                if (playerOrder.length > 1) {
                  $("#log").html("<span style='color:green'>You haven no more cards in your hand or deck.</span><br /><br />"+ $("#log").html());
                } else {
                  broadcastGiveUp();
                  $(".gameButton").prop("disabled", true);
                  $("#textBox").prop("disabled", true);
                };
              }
            }

            if (doc.data().timesShuffled !== timesShuffled) {
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> shuffled their cards.<br /><br />"+ $("#log").html());
              };
              timesShuffled = doc.data().timesShuffled;
            }
            else if (doc.data().timesPassed !== timesPassed) {
              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> passed their turn.<br /><br />"+ $("#log").html());
              };
              timesPassed = doc.data().timesPassed;

              if (turn === playerOrder.length - 1) {
                turn = 0;
              } else {
                turn++;
              };
              incrementTurn(turn, 0);
              printedTurnOrder = false;
            }
            else if (doc.data().words.length !== submittedWords.length) {
              submittedWords = doc.data().words;

              if (playerOrder.indexOf(inputtedName) !== turn) {
                $("#log").html("<span style='color:yellow'>" + playerOrder[turn] + "</span> <span style='color:green'>submitted word " + submittedWords[submittedWords.length - 1] + "</span><br /><br />"+ $("#log").html());
              };

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

              if (turn >= playerOrder.length - 1) {
                turn = 0;
              } else {
                turn++;
              };
              incrementTurn(turn, 0);
              printedTurnOrder = false;
            }
            else if (doc.data().inputtedNames.length !== playerOrder.length) {
              if (playerOrder[turn] !== inputtedName) {
                $("#log").html("<span style='color:red'>" + playerOrder[turn] + " gave up.</span><br /><br />"+ $("#log").html());
              }
              playerOrder.splice(turn, 1);
              if (playerOrder.length <= 0) {
                let scrib = [doc.data().words[0]].concat(doc.data().words.slice(1).map(s => s.slice(1)));
                console.log(scrib);
                $("#log").html(
                  `<div style='text-align:center;'>
                    <span style='color:red'>Game over!</span><br/>
                    All players have given up.<br />
                    <span style='color:yellow'>Your stats:</span><br />
                    Cards left in deck: `
                    + String(deck.length) +
                    `<br />
                    Words spelled: `
                    + String(wordsSpelled) +
                    `<br />
                    Your full Scrib: `
                    + scrib.join("") +
                    `<br />Refresh the page to host or join a new room.<br />
                  </div><br />`
                  + $("#log").html()
                );
                deleteFirestore();
                $(".gameButton").prop("disabled", true);
              }
              else {
                if (playerOrder.length === 1) {
                  turn = 0;
                  if (playerOrder[0] === inputtedName) {
                    $("#log").html("<span style='color:green'>You are now the only player left. Play until the end; you are no longer allowed to shuffle or pass.</span><br /><br />"+ $("#log").html());
                    $("#submit").prop("disabled", false)
                    $("#giveup").prop("disabled", false)
                    $("#shuffle").prop("disabled", true)
                    $("#pass").prop("disabled", true)
                  }
                  else {
                    $("#log").html("<span style='color:yellow'>" + playerOrder[0] + "</span> is now the only player left.<br /><br />"+ $("#log").html());
                    $(".gameButton").prop("disabled", true);
                  };
                  printedTurnOrder = true;
                }
                else {
                  if (turn >= playerOrder.length) {
                    turn = 0;
                  };
                  incrementTurn(turn, 1);
                  printedTurnOrder = false;
                };
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
    let fireStoreData = await getDoc(doc(db, "games", generatedGameID));
    if (fireStoreData.exists()) {
      let arrayWords = fireStoreData.data().words;
      arrayWords.push(word);
      await updateDoc(doc(db, "games", generatedGameID), {
        words: arrayWords,
      });
    } else {
      $("#log").html("<span style='color:red'>Failed to get Firestore document.</span><br /><br />")
    }
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
