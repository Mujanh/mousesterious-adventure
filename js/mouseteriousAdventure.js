/**
 * RPG/adventure game with turn based fights
 */
$(document).ready(function () {
    'use strict';

    /* ------ DOM elements -------- */
    var baddie = document.getElementById("b1"),
        content = document.getElementById("content"),
        output = document.getElementById("output"),
        battleField = document.getElementById("battle-field");

    /* ------ Music and sound effects -------- */
    var battleMusic = new Audio("./sound/battle.wav"),
        bgMusic = new Audio("./sound/background.wav"),
        winMusic = new Audio("./sound/win.wav"),
        lossMusic = new Audio("./sound/loss.wav"),
        itemMusic = new Audio("./sound/item.wav"),
        failMusic = new Audio("./sound/fail.wav"),
        interactMusic = new Audio("./sound/interact.wav");
    interactMusic.volume = 0.7;
    failMusic.volume = 0.6;
    itemMusic.volume = 0.5;

    /* ------ Size and positions -------- */
    var tileSize = 32,
        gridSize = 24,
        left = baddie.offsetLeft,
        top = baddie.offsetTop,
        posLeft = 0,
        posTop = 0;

    /* ------ Battle settings -------- */
    var inBattle = false, //If player is in a fight or not
        currentHP, //HP before fight began
        currentPotions, //Nr of potions before fight began
        enemies = [],
        currentAmbush; //Tile position of current ambush

    /* ------ Room settings -------- */
    var characterPositions = [], //Tile positions of characters in current room
        currentRoom, //Will be assigned an object with current room settings
        itemPositions = []; // Tile positions of items in current room

    /* ------ Other Settings and variables -------- */
    var inConv = false, //If character is in a dialog
        level = 1,
        playerAnswers = [], //player's answers for MageTest in room 6
        player,
        rooms;


    /**
    * Create new item objects to show in each room (e.g. chests and other interactable objects)
    * @param integer x, horizontal position of item (0,0 is in top left corner of game field)
    * @param integer y, vertical position of item (0,0 is in top left corner of game field)
    * @param string itemclass, classname for the item
    *
    * @return void;
    */
    function Items(x, y, itemclass) {
        var item = document.createElement('div');
        item.className = "room_item " + itemclass;
        this.positionX = x;
        this.positionY = y;
        this.item = item;

        content.appendChild(item);
    }

    Items.prototype = {
        drawItem: function () {
            //place the item in the content div
            this.item.style.left = this.positionX * tileSize + "px";
            this.item.style.top = this.positionY * tileSize + "px";
        },
        tilePos: function () {
            //Return the tilenr the item is placed on
            return this.positionX + this.positionY * gridSize;
        }
    };

    /**
    * Create new characters to show and interact with in room
    * @param integer posX, horizontal position of character (0,0 is in top left corner of game field)
    * @param integer posY, vertical position of character (0,0 is in top left corner of game field)
    * @param string id, character's id
    * @param string _class, character's classname
    *
    * @return void;
    */
    function Npc(posX, posY, id, _class) {
        var character = document.createElement('div');
        character.id = id;
        character.className = "character " + _class;
        content.appendChild(character);
        this.character = character;
        this.positionX = posX;
        this.positionY = posY;
    }

    Npc.prototype = {
        drawNpc: function () {
            //Place character in content div
            this.character.style.left = this.positionX * tileSize + "px";
            this.character.style.top = this.positionY * tileSize + "px";
        },
        tilePos: function () {
            //Return tile nr (tile position) of character
            return this.positionX + this.positionY * gridSize;
        }
    };

    /**
    * Remove an item from the player's inventory
    * @param string, item to remove from inventory (element's id if a key otherwise classname)
    *
    * @return void
    */
    function removeFromInventory(item) {

        //If classname of item can be found in inventory, reduce nr of that type of items by 1
        if (player.inventory[item] !== undefined) {
            player.inventory[item] -= 1;
            $('#nr' + item).text("x" + player.inventory[item]);

            //Remove item completely from inventory if there's no left
            if (player.inventory[item] === 0) {
                $('div').remove("." + item);
            }
            console.log("Removed " + item + " from inventory");

        //Check if id can be found among the keys in inventory and remove from inventory
        } else if (player.inventory.keys[item] !== undefined) {
            player.inventory.keys[item] -= 1;
            $('div').remove("#" + item);
            console.log("Removed " + item + " from inventory");
        } else {
            console.log("Can't remove " + item + " from inventory, no such item found");
        }
    }

    /**
    * Add an item to player's inventory
    * @param string itemtype, type of item to add, will also be the classname for the created dom element
    * @param string id, id for the item
    * @param integer quantity (optional), how many items to add (only necessary if more than 1)
    * @param boolean silence (optional), set to true if no sound should be played when adding the item to inventory
    *
    * @return void
    */
    function addToInventory(itemtype, id, quantity, silence) {
        //Default values for quantity and sound
        var nr = quantity || 1;
        var soundOff = silence || false;

        //Only play sound effect if silence is set to false
        if (soundOff === false) {
            itemMusic.play();
        }

        //Check if the item to add has not been added before or if it's quantity is zero
        if (player.inventory[itemtype] === undefined || player.inventory[itemtype] === 0) {
            console.log("Added new item to inventory: " + itemtype);
            //If itemtype is keys, create new index in inventory using classname (itemtype)
            //and add id to keys object/array to keep track of individual keys
            if (itemtype === 'keys') {
                player.inventory[itemtype] = {};
                player.inventory[itemtype][id] = nr;
                console.log("added to inv: " + player.inventory.keys[id]);

            //If itemtype is NOT keys, create new index in inventory using classname (itemtype)
            } else {
                player.inventory[itemtype] = nr;
            }

            //Create a new div to display in inventory
            $("<div></div>")
                .addClass("item " + itemtype)
                .attr("id", id)
                .html("<div id='nr" + itemtype + "'>x" + nr + "</div>")
                .appendTo($("#inventory"));

        //If itemtype is already in inventory, increment its quantity
        } else {
            console.log("Updated quantity of item in inventory: " + itemtype);
            //NOT keys
            if (itemtype !== 'keys') {
                player.inventory[itemtype] += nr;

                $("#nr" + itemtype).text("x" + player.inventory[itemtype]);

            //Keys
            } else {
                console.log("added another key");
                player.inventory.keys[id] = nr;
                $("<div></div>")
                    .addClass("item " + itemtype)
                    .attr("id", id)
                    .html("<div id='nr" + itemtype + "'>x" + nr + "</div>")
                    .appendTo($("#inventory"));
            }

        }

    }

    /**
    * Move baddie in gamearea
    * @param integer x, the horizontal position of Baddie
    * @param integer y, the vertical position of Baddie
    *
    * @return void
    */
    var moveBaddie = function (x, y) {
        //Calculate position
        posLeft += x;
        posTop += y;

        left = posLeft * tileSize;
        top = posTop * tileSize;

        //Move baddie
        baddie.style.left = left + "px";
        baddie.style.top = top + "px";

    };

    /**
    * Draw the gamearea with all the tiles (grass, walls etc)
    * @param array gameArea, the gamearea to draw
    *
    * @return void
    */
    function drawGamePlan(gameArea) {
        var i, tile, tileFromArray;
        console.log("Drawing gameplan.");

        //Iterate over tiles in gamearray and add to content div
        for (i = 0; i < gameArea.length; i += 1) {
            tile = document.createElement("div");

            tileFromArray = gameArea[i];

            tile.className = "tile t" + tileFromArray;

            tile.id = "n" + i;

            content.appendChild(tile);
        }
    }

    /**
    * Initate an area with characters, items and start position. Also draw the gameboard
    *
    * @param int areaToInit, number of area to init (e.g. 1 for area/room 1)
    * @param string fromPosition, from which room/area do the character come from
    *
    * @return void
    */
    var initArea = function (areaToInit, fromPosition) {

        console.log("Initiating room " + areaToInit);
        //Empty area and arrays of values connected to previous room
        $('#battle').hide();
        $('div').remove('.tile');
        $('div').remove('.character');
        $('div').remove('.room_item');
        $(output).hide();
        itemPositions = [];
        characterPositions = [];

        //Check which area to draw and initiate
        switch (areaToInit) {

        //Room 1 - the castle
        case 1:
            currentRoom = rooms.room1;
            if (fromPosition === 'start') {
                moveBaddie(1, 1);
            } else if (fromPosition === 'cellar') {
                posLeft = 0;
                posTop = 0;
                moveBaddie(2, 21);
            } else if (fromPosition === 'garden') {
                posLeft = 0;
                posTop = 0;
                moveBaddie(22, 11);
            }
            break;

        //Room 2 - the cellar
        case 2:
            currentRoom = rooms.room2;
            posLeft = 0;
            posTop = 0;

            moveBaddie(2, 1);
            break;

        //Room 3 - the garden
        case 3:
            currentRoom = rooms.room3;
            posLeft = 0;
            posTop = 0;
            if (fromPosition === 'castle') {
                moveBaddie(1, 1);
            } else if (fromPosition === 'village') {
                moveBaddie(22, 15);
            }
            break;

        //Room 4 - the village
        case 4:
            currentRoom = rooms.room4;
            posLeft = 0;
            posTop = 0;
            if (fromPosition === 'garden') {
                moveBaddie(1, 11);
            } else if (fromPosition === 'forest') {
                moveBaddie(22, 11);
            }
            break;

        //Room 5 - the forest
        case 5:
            currentRoom = rooms.room5;
            posLeft = 0;
            posTop = 0;
            if (fromPosition === 'village') {
                moveBaddie(1, 11);
            } else if (fromPosition === 'cabin') {
                moveBaddie(22, 11);
            }
            break;

        //Room 6 - the cabin
        case 6:
            currentRoom = rooms.room6;
            posLeft = 0;
            posTop = 0;
            if (fromPosition === 'forest') {
                moveBaddie(1, 11);
            }
            break;
        }

        //Draw characters, items and game area
        drawGamePlan(currentRoom.gameArea);
        currentRoom.drawCharacters();
        currentRoom.drawItems();
        $('#content').fadeIn(500);

    };

    /**
    * Mage's quiz in cabin area
    * @param integer index, which question the player is answering
    *
    * @return void
    */
    function mageTest(index) {
        var questions = ["I eat most things, but this particular dish I hate.", "I can't stand it when people...", "My new project involves some studying of this type of animal."],
            correctAnswers = ["porridge", "joke", "rabbits"],
            answers = [
                ["porridge", "potatoes", "pancakes"],
                ["yawn", "joke", "juggle"],
                ["rabbits", "rats", "reptiles"]
            ],
            count,
            i;

        // Questions
        $("#info").html("<div id='infoinner'><h2>Question nr " + (index + 1) + ".</h2> <p>" + questions[index] + "</p></div>").show();

        //Button 1
        $("<button id='" + answers[index][0] + "' class='mageTestBtn'>" + answers[index][0] + "</button>")
            .click(function () {
                playerAnswers.push($(this).attr('id'));

                //Have all questions been answered? If not, show next question, otherwise check answers
                if (index < 2) {
                    index += 1;
                    mageTest(index);
                } else {

                    //increment count for each correct answer
                    count = 0;
                    for (i = 0; i < correctAnswers.length; i += 1) {
                        if (correctAnswers[i] === playerAnswers[i]) {
                            count += 1;
                        }
                    }

                    if (count === 3) {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You answered all three correctly, well done! Well, I suppose I should give you the book then, here you go.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                        currentRoom.characters.elf.book = 0;
                        addToInventory('book', 'book1');

                    } else {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You didn't answer all my questions correctly, I'll hold on to the book until you've become wiser.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                    }
                }
            }).appendTo($("#infoinner"));

        //Button 2
        $("<button id='" + answers[index][1] + "' class='mageTestBtn'>" + answers[index][1] + "</button>")
            .click(function () {
                playerAnswers.push($(this).attr('id'));
                //Have all questions been answered? If not, show next question, otherwise check answers
                if (index < 2) {
                    index += 1;
                    mageTest(index);
                } else {

                    //increment count for each correct answer
                    count = 0;
                    for (i = 0; i < correctAnswers.length; i += 1) {
                        if (correctAnswers[i] === playerAnswers[i]) {
                            count += 1;
                        }
                    }

                    if (count === 3) {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You answered all three correctly, well done! Well, I suppose I should give you the book then, here you go.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                        currentRoom.characters.elf.book = 0;
                        addToInventory('book', 'book1');

                    } else {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You didn't answer all my questions correctly, I'll hold on to the book until you've become wiser.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                    }
                }
            }).appendTo($("#infoinner"));

        //Button 3
        $("<button id='" + answers[index][2] + "' class='mageTestBtn'>" + answers[index][2] + "</button>")
            .click(function () {
                playerAnswers.push($(this).attr('id'));
                //Have all questions been answered? If not, show next question, otherwise check answers
                if (index < 2) {
                    index += 1;
                    mageTest(index);
                } else {

                    //increment count for each correct answer
                    count = 0;
                    for (i = 0; i < correctAnswers.length; i += 1) {
                        if (correctAnswers[i] === playerAnswers[i]) {
                            count += 1;
                        }
                    }

                    if (count === 3) {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You answered all three correctly, well done! Well, I suppose I should give you the book then, here you go.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                        currentRoom.characters.elf.book = 0;
                        addToInventory('book', 'book1');

                    } else {
                        $("#info").fadeOut();
                        $("#content").show();
                        inConv = true;
                        $(output).html("<p>You didn't answer all my questions correctly, I'll hold on to the book until you've become wiser.</p><p><em>Press space bar to close dialog...</em></p>").fadeIn();
                    }
                }
            }).appendTo($("#infoinner"));


    }

    /**
    * Object with all room details
    */
    rooms = {
        //First room
        room1: {
            characters: {
                character1: {
                    name: 'professor',
                    positionX: 3,
                    positionY: 3,
                    interaction: function () {
                        inConv = true;
                        interactMusic.play();

                        //If book has not been found yet, show start dialog
                        if (player.inventory.book === undefined) {
                            $(output).html("<p><strong>Professor:</strong> Good, you're here! </p> <p>Many years ago I misplaced a very important book, now rumor has it that an old mage has found it and.. well is planning on using it in a very bad way.</p> <p>I need you to find the mage and bring the book back to me before it is all too late. </p><p>Be careful, though. These lands have been invaded by some pretty nasty creatures lately, you should find yourself a weapon before heading out the door.</p><p><em>Press space to close dialog...</em></p>").show();

                        //Otherwise show end dialog
                        } else {
                            $(output).html("<p><strong>Professor:</strong> Ah, my book! At last I can continue my.. eh.. studies! Yes, my completely innocent studies with nothing but good intentions for this kingdom! Ha.. mwhahahaha.. erhm.. </p>");
                            removeFromInventory('book');
                            $(output).fadeToggle();

                            window.setTimeout(function () {
                                $("#info").html("<div id='infoinner'><h2>End of episode I</h2><p>To be continued...</p></div>");
                                $(content).hide();
                                $("#info").fadeIn();
                            }, 6500);
                        }

                    }
                }
            },
            items: {
                item1: {
                    type: 'fountain',
                    status: 'unused',
                    inside: 'key3',
                    positionX: 18,
                    positionY: 4,
                    interaction: function () {
                        //If there's something in the fountain, add it to inventory
                        if (this.inside !== '') {
                            $(output).html('<p>You see something in the fountain... a key!</p>').show();
                            addToInventory("keys", this.inside);
                            this.inside = '';
                            console.log("You picked up a key!");
                        }

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);

                    }
                },
                item2: {
                    type: 'fountain',
                    status: 'unused',
                    inside: 'water',
                    positionX: 18,
                    positionY: 11,
                    interaction: function () {
                        //Fountain is empty, display info message
                        $(output).html('<p>Nothing but water in this fountain.</p>').show();
                        failMusic.play();

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);

                    }
                },
                item3: {
                    type: 'fountain',
                    status: 'unused',
                    inside: 'water',
                    positionX: 18,
                    positionY: 19,
                    interaction: function () {
                        //Fountain is empty, display info message
                        $(output).html('<p>Nothing but water in this fountain.</p>').show();

                        failMusic.play();

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);

                    }
                }
            },
            exits: {
                positions: [507, 319, 287],
                interaction: function (tilePos) {

                    //Initiate the cellar (room 2)
                    if (tilePos === 507) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The basement</h2></div>").show();
                        window.setTimeout(function () {

                            $("#info").fadeOut('slow');
                            initArea(2, 'castle');
                        }, 1500);

                    //Only allow the player to leave the castle if he/she has found the wand
                    } else if (tilePos === 319) {
                        if (player.inventory.wand === undefined) {
                            $(output).html("<p>You have no weapon yet and the lands are full of enemies. You should go back inside and find a weapon before you venture out.</p>").show();
                            window.setTimeout(function () {
                                $(output).fadeOut('slow');
                            }, 2500);
                            moveBaddie(-1, 0);
                        }

                    //Initiate garden (room 3) if key has been found, otherwise display info message
                    } else if (tilePos === 287) {
                        if (player.inventory.keys.key3 === undefined) {
                            $(output).html("<p>The door is locked, you need to find a key first. I wonder where it can be...</p>").show();
                            window.setTimeout(function () {
                                $(output).fadeOut('slow');
                            }, 2500);
                            moveBaddie(-1, 0);
                        } else {
                            removeFromInventory('key3');
                            $(output).html("<p>You unlock the door with the key</p>").show();
                            $("#content").fadeOut('slow');
                            $("#info").html("<div id='infoinner'><h2>The garden</h2></div>").show();
                            window.setTimeout(function () {
                                $("#info").fadeOut('slow');
                                initArea(3, 'castle');
                                $(output).fadeOut('slow');
                            }, 1500);
                        }
                    }
                }
            },
            ambush: [321, 403, 518],
            gameArea: [
                11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 19, 20, 21, 22, 13, 20, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 26,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 13, 10, 10, 17, 17, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 19, 20, 21, 22, 13, 20, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 24, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 23, 23, 23, 23, 23, 23, 19, 10, 10, 16, 16, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11,
                11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11
            ],
            drawCharacters: function () {
                //Create new characters and place them on game field
                var prof;
                prof = new Npc(3, 3, 'b2', 'professor');
                prof.drawNpc();
                characterPositions.push(prof.tilePos());

            },
            drawItems: function () {
                //Create new items and add to game field
                var fountain1, fountain2, fountain3;
                fountain1 = new Items(18, 4, "dry-fountain");
                fountain1.drawItem();

                fountain2 = new Items(18, 11, "fountain");
                fountain2.drawItem();

                fountain3 = new Items(18, 19, "fountain");
                fountain3.drawItem();

                //Push tile positions of items into array to compare positions with for interaction
                itemPositions.push(fountain1.tilePos(), fountain2.tilePos(), fountain3.tilePos());
            }
        },
        //Room 2
        room2: {
            characters: {},
            items: {
                item1: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'key1',
                    positionX: 1,
                    positionY: 7,
                    interaction: function () {
                        //If there's something in the chest, add it to inventory
                        if (this.inside !== '') {
                            $(output).html('<p>You open the chest and find a key! I wonder what it unlocks...</p>').show();
                            addToInventory("keys", this.inside);
                            this.inside = '';
                        }
                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);

                    }
                },
                item2: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'key2',
                    positionX: 1,
                    positionY: 13,
                    interaction: function () {
                        //If there's something in the chest, add it to inventory
                        //Key1 is needed to unlock the chest
                        if (player.inventory.keys !== undefined && player.inventory.keys.key1 !== undefined) {
                            if (this.inside !== '') {
                                $(output).html("<p>You unlock the chest and find a new key inside. I wonder where it goes?</p>").show();
                                removeFromInventory("key1");
                                addToInventory("keys", this.inside);
                                this.inside = '';
                            } else if (this.inside === '' || player.inventory.keys.key1 === 0) {
                                console.log("already emptied chest");
                                failMusic.play();
                            }
                        } else {
                            $(output).html("<p>The chest appears to be locked... If only you could find the key</p>").show();
                            failMusic.play();

                        }

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);

                    }
                },
                item3: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'wand',
                    positionX: 22,
                    positionY: 7,
                    interaction: function () {
                        //Pick up wand if key2 is in inventory
                        if (player.inventory.keys !== undefined) {

                            //Check if correct key is used
                            if (player.inventory.keys.key2 !== undefined) {
                                console.log("A wand!");
                                addToInventory('wand', 'wooden');
                                removeFromInventory('key2');
                                this.inside = '';
                                $(output).html("<p>You unlock the chest with the key and find a wand! This might come in handy</p>").show();
                            } else if (player.inventory.keys.key1 !== undefined && player.inventory.keys.key1 > 0) {
                                $(output).html("<p>Hmm... No, that key doesn't seem to fit here</p>").show();
                                failMusic.play();
                            }

                        } else {
                            $(output).html("<p>The chest is locked, maybe there's a key somewhere...</p>").show();
                            failMusic.play();
                        }

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item4: {
                    type: 'chest',
                    status: 'unused',
                    inside: '',
                    positionX: 22,
                    positionY: 13,
                    interaction: function () {
                        //Empty chest, display message
                        $(output).html("<p>The chest is empty</p>");
                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item5: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 22,
                    positionY: 19,
                    interaction: function () {
                        //Grab the potion from chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item6: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 1,
                    positionY: 19,
                    interaction: function () {
                        //Grab the potion from chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                }

            },
            exits: {
                positions: [25],
                interaction: function (tilePos) {
                    //exit interactions
                    if (tilePos === 25) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The castle</h2></div>").show();
                        window.setTimeout(function () {

                            $("#info").fadeOut('slow');
                            initArea(1, 'cellar');

                        }, 1500);

                    }
                }
            },
            gameArea: [
                11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11,
                11, 27, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 11,
                11, 19, 20, 21, 22, 19, 20, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 20, 21, 22, 19, 20, 21, 11,
                11, 28, 28, 28, 28, 28, 28, 22, 28, 28, 28, 28, 28, 28, 28, 28, 20, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 11,
                11, 19, 20, 21, 22, 19, 20, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 20, 21, 22, 19, 20, 21, 11,
                11, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 20, 28, 28, 28, 28, 28, 28, 28, 28, 22, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 22, 28, 28, 28, 28, 28, 28, 28, 28, 20, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 11,
                11, 19, 20, 21, 22, 19, 20, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 20, 21, 22, 19, 20, 21, 11,
                11, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 22, 28, 28, 28, 28, 28, 28, 28, 28, 20, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 28, 28, 13, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 21, 28, 28, 28, 28, 28, 28, 28, 28, 19, 28, 28, 28, 28, 28, 28, 11,
                11, 28, 28, 28, 28, 28, 28, 22, 28, 28, 28, 28, 28, 28, 28, 28, 20, 28, 28, 28, 28, 28, 28, 11,
                11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11
            ],
            ambush: [],
            drawItems: function () {
                //Create new chests and add to game field
                var chest1, chest2, chest3, chest4, chest5, chest6;
                chest1 = new Items(1, 7, "chest");
                chest1.drawItem();
                chest2 = new Items(1, 13, "chest");
                chest2.drawItem();
                chest3 = new Items(22, 7, "chest");
                chest3.drawItem();
                chest4 = new Items(22, 13, "chest");
                chest4.drawItem();
                chest5 = new Items(22, 19, "chest");
                chest5.drawItem();
                chest6 = new Items(1, 19, "chest");
                chest6.drawItem();

                //Push tile positions of items into array to compare positions with for interaction
                itemPositions.push(chest1.tilePos(), chest2.tilePos(), chest3.tilePos(), chest4.tilePos(), chest5.tilePos(), chest6.tilePos());
                console.log(itemPositions);
            },
            drawCharacters: function () {
                //No characters to draw in this room
            }

        },
        //Room 3
        room3: {
            items: {
                item1: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 16,
                    positionY: 15,
                    interaction: function () {
                        //Pick up potion inside chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item2: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 7,
                    positionY: 22,
                    interaction: function () {
                        //Pick up potion inside chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item3: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 15,
                    positionY: 12,
                    interaction: function () {
                        //Pick up potion inside chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item4: {
                    type: 'chest',
                    status: 'unused',
                    inside: 'potions',
                    positionX: 22,
                    positionY: 1,
                    interaction: function () {
                        //Pick up potion inside chest and add to inventory
                        $(output).html("<p>You look inside the chest and find a health potion</p>").show();
                        addToInventory("potions", 'health');
                        this.inside = '';

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                }
            },
            characters: {},
            exits: {
                positions: [383, 24],
                interaction: function (tilePos) {

                    //Initiate village (room 4)
                    if (tilePos === 383) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The village</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(4, 'garden');
                        }, 1500);

                    //Initiate castle (room 1)
                    } else if (tilePos === 24) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The castle</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(1, 'garden');
                        }, 1500);
                    }
                }
            },
            ambush: [331, 179, 315, 640, 372, 34],
            gameArea: [
                29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29,
                13, 25, 29, 25, 25, 25, 29, 25, 25, 25, 25, 25, 25, 25, 25, 25, 29, 25, 25, 25, 29, 25, 25, 29,
                29, 25, 25, 25, 29, 25, 29, 25, 29, 25, 29, 29, 29, 29, 29, 25, 29, 25, 29, 25, 29, 25, 29, 29,
                29, 29, 29, 25, 29, 25, 25, 25, 29, 25, 25, 25, 25, 25, 29, 25, 25, 25, 29, 25, 25, 25, 25, 29,
                29, 25, 25, 25, 29, 29, 29, 29, 29, 29, 29, 29, 29, 25, 29, 29, 29, 25, 29, 29, 25, 29, 25, 29,
                29, 25, 29, 25, 29, 25, 25, 25, 29, 25, 25, 25, 29, 25, 29, 25, 25, 25, 29, 25, 25, 29, 25, 29,
                29, 25, 29, 25, 25, 25, 29, 25, 29, 25, 29, 25, 29, 25, 29, 25, 29, 29, 29, 25, 29, 29, 25, 29,
                29, 25, 29, 29, 29, 25, 29, 25, 25, 25, 29, 25, 29, 25, 29, 25, 25, 25, 29, 25, 29, 29, 25, 29,
                29, 25, 25, 25, 29, 25, 29, 29, 29, 29, 29, 25, 29, 25, 29, 29, 29, 25, 29, 25, 25, 29, 25, 29,
                29, 29, 29, 25, 29, 25, 25, 25, 29, 25, 25, 25, 29, 25, 29, 25, 25, 25, 29, 29, 25, 29, 25, 29,
                29, 25, 25, 25, 29, 29, 29, 25, 29, 25, 29, 29, 29, 25, 29, 25, 29, 25, 29, 25, 29, 29, 25, 29,
                29, 25, 29, 25, 25, 25, 25, 25, 29, 25, 29, 29, 29, 25, 29, 25, 29, 25, 29, 25, 25, 25, 25, 29,
                29, 25, 29, 29, 29, 29, 29, 29, 29, 25, 25, 25, 25, 25, 29, 25, 25, 25, 29, 25, 29, 29, 25, 29,
                29, 25, 25, 25, 29, 25, 25, 25, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 25, 25, 25, 25, 29,
                29, 29, 29, 25, 29, 25, 29, 25, 25, 25, 25, 29, 25, 25, 25, 25, 25, 29, 25, 25, 29, 29, 29, 29,
                29, 25, 25, 25, 29, 25, 29, 29, 29, 29, 25, 29, 25, 29, 29, 29, 25, 29, 25, 29, 29, 25, 25, 13,
                29, 25, 29, 29, 29, 25, 25, 25, 29, 25, 25, 29, 25, 25, 25, 29, 29, 29, 25, 25, 29, 25, 29, 29,
                29, 25, 25, 25, 25, 25, 29, 25, 29, 25, 29, 29, 29, 29, 25, 25, 25, 29, 29, 25, 29, 25, 25, 29,
                29, 29, 29, 29, 29, 29, 29, 25, 29, 25, 25, 25, 25, 29, 25, 29, 25, 29, 29, 25, 25, 29, 25, 29,
                29, 25, 25, 25, 25, 25, 25, 25, 29, 29, 29, 29, 25, 29, 25, 29, 25, 25, 25, 29, 25, 25, 25, 29,
                29, 25, 29, 29, 29, 25, 29, 29, 29, 25, 25, 25, 25, 29, 25, 29, 25, 29, 25, 29, 29, 29, 29, 29,
                29, 25, 25, 29, 29, 25, 25, 25, 29, 25, 29, 29, 29, 29, 25, 29, 25, 29, 25, 25, 25, 29, 25, 29,
                29, 29, 25, 25, 25, 25, 29, 25, 29, 25, 25, 25, 25, 25, 25, 29, 25, 25, 25, 29, 25, 25, 25, 29,
                29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29, 29
            ],
            drawItems: function () {
                //Create new chests and add to game field
                var chest1, chest2, chest3, chest4;
                chest1 = new Items(16, 15, "chest");
                chest1.drawItem();
                chest2 = new Items(7, 22, "chest");
                chest2.drawItem();
                chest3 = new Items(15, 12, "chest");
                chest3.drawItem();
                chest4 = new Items(22, 1, "chest");
                chest4.drawItem();

                //Push tile positions of items into array to compare positions with for interaction
                itemPositions.push(chest1.tilePos(), chest2.tilePos(), chest3.tilePos(), chest4.tilePos());
                console.log(itemPositions);
            },
            drawCharacters: function () {
                //No characters to draw in this room
            }
        },

        //Room 4
        room4: {
            items: {},
            characters: {
                character1: {
                    name: 'citizen1',
                    positionX: 5,
                    positionY: 6,
                    interaction: function () {
                        //Display dialog
                        inConv = true;
                        interactMusic.play();
                        $(output).html("<p><strong>Citizen:</strong> The mage? Not sure where he lives, I'm afraid... But one thing I do know is that he absolutely despise porridge.</p><p><em>Press space to close dialog...</em></p>").fadeIn();
                    }
                },
                character2: {
                    name: 'citizen2',
                    positionX: 5,
                    positionY: 16,
                    interaction: function () {
                        //Display dialog
                        inConv = true;
                        interactMusic.play();
                        $(output).html("<p><strong>Citizen:</strong> The mage? Haven't seen him around for ages. He's a really grumpy old man, don't try any jokes on him, it will only make him grumpier.</p><p><em>Press space to close dialog...</em></p>").fadeIn();
                        //$(output).fadeToggle();
                    }
                },
                character3: {
                    name: 'citizen3',
                    positionX: 15,
                    positionY: 6,
                    interaction: function () {
                        //Display dialog
                        inConv = true;
                        interactMusic.play();
                        $(output).html("<p><strong>Citizen:</strong> The mage? Oh dear, what has he been up to now? Last time I saw him he was following some rabbits in the forest.</p><p><em>Press space to close dialog...</em></p>").fadeIn();
                        //$(output).fadeToggle();
                    }
                },
                character4: {
                    name: 'citizen4',
                    positionX: 15,
                    positionY: 16,
                    potions: 4,
                    interaction: function () {
                        //Display dialog
                        inConv = true;
                        interactMusic.play();
                        var msg = "<p><strong>Citizen:</strong> Hmm, so you're looking for the mage? All I know is that he lives in a cabin somewhere in the forest.</p>";

                        //Add potions to inventory if not already done
                        if (this.potions > 0) {
                            msg += "<p>It's full of nasty creatures though... Here, take these health potions with you.</p>";
                            addToInventory("potions", "health", this.potions);
                            this.potions = 0;
                        }

                        msg += "<p><em>Press space to close dialog...</em></p>";

                        $(output).html(msg);
                        $(output).fadeIn();
                    }
                }
            },
            exits: {
                positions: [264, 287],
                interaction: function (tilePos) {

                    //Initiate garden (room 3)
                    if (tilePos === 264) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The garden</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(3, 'village');
                        }, 1500);

                    //Initiate forest (room 5)
                    } else if (tilePos === 287) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The forest</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(5, 'village');
                        }, 1500);
                    }
                }
            },
            ambush: [],
            gameArea: [
                31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 19, 19, 19, 19, 19, 30, 30, 30, 19, 19, 19, 19, 19, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 19, 19, 25, 19, 19, 30, 30, 30, 19, 19, 25, 19, 19, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                13, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 25, 13,
                31, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 25, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 19, 19, 25, 19, 19, 30, 30, 30, 19, 19, 25, 19, 19, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 19, 25, 25, 25, 25, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 19, 19, 19, 19, 19, 19, 30, 30, 30, 19, 19, 19, 19, 19, 19, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31,
                31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31, 31
            ],
            drawCharacters: function () {
                //Create new characters and place them on game field
                var character1, character2, character3, character4;
                character1 = new Npc(5, 6, 'b3', 'character1');
                character1.drawNpc();
                character2 = new Npc(5, 16, 'b4', 'character2');
                character2.drawNpc();
                character3 = new Npc(15, 6, 'b5', 'character3');
                character3.drawNpc();
                character4 = new Npc(15, 16, 'b6', 'character4');
                character4.drawNpc();

                characterPositions.push(character1.tilePos(), character2.tilePos(), character3.tilePos(), character4.tilePos());
                console.log(characterPositions);

            },
            drawItems: function () {
                //No items to draw in this room
            }
        },

        //Room 5
        room5: {
            ambush: [270, 322, 398, 498, 490, 435, 254, 274, 284, 136, 107, 103, 411],
            exits: {
                positions: [287, 264],
                interaction: function (tilePos) {

                    //Initiate cabin (room 6)
                    if (tilePos === 287) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The cabin</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(6, 'forest');
                        }, 1500);

                    //Initiate village (room 4)
                    } else if (tilePos === 264) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The village</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(4, 'forest');
                        }, 1500);
                    }
                }
            },
            characters: {},
            items: {
                item1: {
                    type: 'rock',
                    status: 'unused',
                    inside: 'rock',
                    positionX: 11,
                    positionY: 23,
                    interaction: function () {
                        //Rock is blocking the way, display message
                        $(output).html("<p>Hmm, there's a big rock blocking the way, better go in a different direction.</p>").show();

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                },
                item2: {
                    type: 'rock',
                    status: 'unused',
                    inside: 'rock',
                    positionX: 11,
                    positionY: 0,
                    interaction: function () {
                        //Rock is blocking the way, display message
                        $(output).html("<p>Hmm, there's a big rock blocking the way, better go in a different direction.</p>").show();

                        window.setTimeout(function () {
                            $(output).fadeOut('slow');
                        }, 2500);
                    }
                }
            },
            gameArea: [
                32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 30, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 32, 30, 30, 30, 32, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30,
                32, 30, 30, 32, 30, 32, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 32, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 32, 30, 32, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 32,
                32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 30, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32
            ],
            drawItems: function () {
                //Create new items and add to game field
                var rock, rock2;
                rock = new Items(11, 23, "rock");
                rock.drawItem();
                rock2 = new Items(11, 0, "rock");
                rock2.drawItem();

                //Push tile positions of items into array to compare positions with for interaction
                itemPositions.push(rock.tilePos(), rock2.tilePos());
                console.log(itemPositions);
            },
            drawCharacters: function () {
                //No characters to draw in this room
            }
        },

        //Room 6
        room6: {
            characters: {
                elf: {
                    name: 'elf',
                    positionX: 9,
                    positionY: 9,
                    book: 1,
                    interaction: function () {

                        interactMusic.play();

                        //Check if book is still in character's inventory (i.e. the player has not been given it yet)
                        if (this.book === 1) {
                            $(output).html("<p><strong>Mage: </strong>The book? Ha, it's a lot safer with me than with that fool of a professor, I promise you that.</p> <p>I tell you what, I'll give the book to you if you can answer all three of my questions correctly...</p>").fadeIn('slow');

                            //Initiate the mage's quiz
                            window.setTimeout(function () {
                                $(output).fadeOut('slow');
                                $("#content").hide();
                                mageTest(0);
                            }, 6000);

                        } else {
                            inConv = true;
                            $(output).html("<p>You have already gotten the book! Now, head back to the professor.</p><p><em>Press space to close dialog...</em></p>").fadeIn();
                        }
                    }
                }

            },
            items: {},
            exits: {
                positions: [264],
                interaction: function (tilePos) {

                    //Initiate the forest (room 5)
                    if (tilePos === 264) {
                        $("#content").fadeOut('slow');
                        $("#info").html("<div id='infoinner'><h2>The forest</h2></div>").show();

                        window.setTimeout(function () {
                            $("#info").fadeOut('slow');
                            initArea(5, 'cabin');
                        }, 1500);
                    }
                }
            },
            ambush: [],
            gameArea: [
                32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 32, 30, 30, 30, 32, 30, 30, 30, 31, 31, 31, 31, 31, 31, 31, 30, 30, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 31, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 31, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 13, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                32, 30, 30, 32, 30, 32, 30, 30, 30, 30, 30, 32, 30, 31, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 31, 25, 25, 25, 25, 25, 31, 30, 30, 30, 32,
                32, 30, 30, 32, 30, 30, 30, 30, 32, 30, 30, 30, 32, 31, 31, 31, 31, 31, 31, 31, 32, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 32, 30, 32, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32,
                32, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 32, 30, 32,
                32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32, 32
            ],
            drawCharacters: function () {
                //Create new characters and place them on game field
                var elf;
                elf = new Npc(9, 9, 'b7', 'elf');
                elf.drawNpc();

                characterPositions.push(elf.tilePos());
                console.log(characterPositions);

            },
            drawItems: function () {
                //No items to draw in this room
            }
        }
    };

    /**
    * Create a random number between a minimal and maximal value
    * @param integer min, the minimal value
    * @param integer max, the maximal value
    *
    * @return integer
    */
    function random(min, max) {
        return Math.floor(Math.random() * (max + 1 - min) + min);
    }

    /**
    * Create new player objects
    * @param integer hp, the player's hp (health)
    * @param integer ap, the player's ap (mana/action points)
    *
    * @return player object
    */
    function Players(hp, ap) {
        this.hp = hp;
        this.ap = ap;
        this.maxhp = hp;
        this.maxap = ap;
        this.xp = 0;
        this.inventory = {};
    }

    Players.prototype = {
        updateStats: function (hp, ap) {
            this.hp = hp;
            this.ap = ap;
        },
        attack: function () {
            //Let damage increase with level (only 1 level available at the moment)
            // Return damage
            var max = level * 25;
            var min = level * 7;
            return random(min, max);
        },
        attack2: function () {
            //Let damage increase with level (only 1 level available at the moment)
            // Return damage
            var max = level * 35;
            var min = level * 15;
            return random(min, max);
        }
    };

    /**
    * Create a new enemy object
    * @param string enemyType, the type of enemy to create
    *
    * @return object
    */
    function Enemy(enemyType) {
        var enemy = document.createElement('div');
        enemy.className = "enemy " + enemyType;
        battleField.appendChild(enemy);

        var hp;

        switch (enemyType) {
        case 'goblin':
            hp = 145;
            break;
        case 'dragon':
            hp = 160;
            break;
        case 'knight':
            hp = 130;
            break;
        default:
            hp = 150;
            console.log("No such enemy type, default of 150hp was chosen");
        }
        this.enemy = enemy;
        this.hp = hp;
        this.ap = 10;
        this.maxhp = hp;
        this.maxap = 10;
        this.enemyType = enemyType;
        this.defeated = false;
    }

    Enemy.prototype = {
        attack: function () {
            //Calculate damage, let it increment with level
            var max = level * 20;
            var min = level * 5;
            return random(min, max);
        }

    };

    /**
    * Move a tile around the gamearea (e.g. a box).
    * @param integer current, the current game tile
    * @param integer next, the next game tile
    *
    * @return void
    */
    var moveTile = function (current, next) {
        var tile = currentRoom.gameArea[current];

        currentRoom.gameArea[next] = tile;
        currentRoom.gameArea[current] = 10;

        document.getElementById("n" + next).className = "tile t" + tile;
        document.getElementById("n" + current).className = "tile t" + 10;

    };

    /**
    * Check who won and display info message. Add potions if player hp and nr of potions is low
    * @param boolean success, true of player won and false if enemy won
    * @return void
    */
    function hasWon(success) {
        inBattle = false;
        var message;
        battleMusic.pause();
        $('#battle').hide();

        //If player won
        if (success === true) {
            winMusic.play();

            //Remove this ambush from ambushes to let the player walk on the tile
            currentRoom.ambush.splice(currentRoom.ambush.indexOf(currentAmbush), 1);

            //Remove the enemy
            enemies[0].enemy.remove();
            enemies = [];

            //Display message and add potions if player's hp is low or doesn't have many health potions
            message = "<h2>Victory!</h2>";
            if ((player.hp < 130 && player.inventory.potions < 2) || player.inventory.potions === 0) {
                message += "<p>The enemy dropped a health potion. You add it to your inventory.</p>";
                addToInventory("potions", "health");
            }

        //If player lost
        } else {
            lossMusic.play();

            //Reset enemy's and player's stats
            enemies[0].hp = enemies[0].maxhp;
            enemies[0].ap = enemies[0].maxap;
            player.hp = currentHP; //Hp before battle began

            //Reset to nr of potions before battle began
            if (player.inventory.potions !== currentPotions) {
                currentPotions = (currentPotions - player.inventory.potions);
                addToInventory("potions", "health", currentPotions, true);
            }

            message = "<h2>Defeat</h2><p>Better luck next time</p>";
        }

        $("#info").html("<div id='infoinner'>" + message + "</div>").fadeIn();

        //Show gamefield again
        window.setTimeout(function () {
            $("#info").fadeOut();
            $('#content').show();
            bgMusic.play();
        }, 3000);

    }

    /**
    * Check if action buttons (attacks and potions) should be disabled or enabled
    * Disable buttons if there's not enough ap to cast the abilities
    *
    * @return void
    */
    function checkIfBtnDisable() {
        //Wind attack (#attack2) button costs 6 ap
        if (player.ap >= 6) {
            $("#attack2").attr("disabled", false);
        } else {
            $("#attack2").attr("disabled", true);
        }

        //Ice attack (#attack) button costs 4 ap
        if (player.ap >= 4) {
            $("#attack").attr("disabled", false);
        } else {
            $("#attack").attr("disabled", true);
        }

        //Potion (#potion) button costs 3 ap and requires 1 potion and hp below max hp to work
        if (player.inventory.potions > 0 && player.hp < player.maxhp && player.ap >= 3) {
            $("#potion").attr("disabled", false);
        } else {
            $("#potion").attr("disabled", true);
        }

        $("#endturn").attr("disabled", false);

    }

    /**
    * Check if it is time to change turn or end battle
    * Ends battle if either player or enemy has 0 or below hp
    * Changes turn if ap is zero
    *
    * @param int turn, whos turn it is. 0 for user's turn and 1 for enemy's turn. As of now, only needed for enemy turn
    *
    * @return void
    */
    function nextTurnOrEndBattle(turn) {

        //Is enemy defeated?
        if (enemies[0].hp <= 0) {
            console.log("Enemy hp is zero or below");
            hasWon(true);

        //Is player out of ap? Change turn to enemy's turn
        } else if (player.ap === 0) {
            $("#attack, #attack2, #potion, #endturn").hide();
            window.setTimeout(function () {
                battleAction(1);
            }, 1000);

        // Is player defeated?
        } else if (player.hp <= 0) {
            console.log("Player hp is zero or below");
            hasWon(false);

        // Is enemy out of ap? change turn to player's turn
        } else if (enemies[0].ap <= 0) {
            window.setTimeout(function () {
                enemies[0].ap = enemies[0].maxap;
                battleAction(0);
            }, 1800);

        // Is it enemy's turn and enemy still has ap? run battleaction again as enemy's turn
        } else if (turn === 1 && enemies[0].ap > 0) {
            window.setTimeout(function () {
                battleAction(1);
            }, 1800);
        }
    }

    /** --------------------- Ice Attack button event listeners ------------------------ */

    //Show info about spell on hover
    $("#attack").hover(function () {
        $("#battle-options").append("<div class='spell-info'>Ice Spell. Cost: 4 AP. Deals 7-25 damage.</div>");
    }, function () {
        $("div").remove(".spell-info");
    });

    //Attack the enemy (attack animations and hp/ap updates)
    $("#attack").click(function () {
        var attackSound = new Audio("./sound/attack.wav");
        attackSound.volume = 0.9;

        //Spell costs 4 ap, only use spell if player has at least 4 ap
        if (player.ap >= 4) {
            attackSound.play();
            var damage, damageOutput;

            //Calculate damage and chance to miss
            var randInt = random(0, 10);
            if (randInt % 9 === 0) {
                damage = 0;
                damageOutput = "miss";
            } else {
                damage = player.attack();
                damageOutput = "-" + damage;
            }

            $("div").remove(".spell-info"); //Remove hover-info (otherwise won't be remove when button gets disabled)

            //Decrease player ap and enemy health
            player.ap -= 4;
            enemies[0].hp -= damage;

            $("#battle-options > button").attr("disabled", true); //Disable buttons when executing the attack

            //Animate attack
            $('<div class="particle friendly"></div>')
                .animate({
                    left: '670'
                }, 'slow', 'swing', function () {

                    //When attack animation is done, show damage done and update player ap
                    $("#playerap").text(player.ap + "/" + player.maxap);
                    $("#enemyhp").text(enemies[0].hp + "/" + enemies[0].maxhp);
                    $("#dmgEnemy").removeClass('green').addClass('red').text(damageOutput).fadeIn();
                    $("#dmgEnemy").fadeOut();
                    $(this).remove();

                    checkIfBtnDisable(); //Check if any buttons should be disabled or enabled
                    nextTurnOrEndBattle(); //Check if it is time for enemy's turn or if player has won
                })
                .appendTo($("#battle-field"));
        }

    });

    /** --------------------- Wind Attack button event listeners ------------------------ */

    //Show info about spell on hover
    $("#attack2").hover(function () {
        $("#battle-options").append("<div class='spell-info'>Wind spell. Cost: 6 AP. Deals 15-35 damage.</div>");
    }, function () {
        $("div").remove(".spell-info");
    });

    //Attack the enemy (attack animations and hp/ap updates)
    $("#attack2").click(function () {
        var attackSound = new Audio("./sound/wind.wav");

        //Only perform attack if player has enough ap (at least 6)
        if (player.ap >= 6) {
            attackSound.play();
            var damage, damageOutput;

            //Calculate damage and chance to miss
            var randInt = random(0, 10);
            if (randInt % 9 === 0) {
                damage = 0;
                damageOutput = "miss";
            } else {
                damage = player.attack2();
                damageOutput = "-" + damage;
            }

            //Update player ap and enemy hp
            player.ap -= 6;
            enemies[0].hp -= damage;

            $("#battle-options > button").attr("disabled", true); //Disable buttons
            $("div").remove(".spell-info"); //Remove hover-info (otherwise won't be remove when button gets disabled)

            //Animate the attack
            $('<div class="particle icestorm"></div>')
                .animate({
                    left: '660'
                }, 'slow', 'swing', function () {

                    //When animation is complete, update ap and hp
                    $("#playerap").text(player.ap + "/" + player.maxap);
                    $("#enemyhp").text(enemies[0].hp + "/" + enemies[0].maxhp);
                    $("#dmgEnemy").removeClass('green').addClass('red').text(damageOutput).fadeIn();
                    $("#dmgEnemy").fadeOut();
                    $(this).remove();

                    checkIfBtnDisable(); //Enable or disable buttons
                    nextTurnOrEndBattle(); //Check if enemy's turn or if player has won
                })
                .appendTo($("#battle-field"));
        }

    });

    /** --------------------- Potion button event listeners ------------------------ */

    //Show info about spell on hover
    $("#potion").hover(function () {
        $("#battle-options").append("<div class='spell-info'>Health Potion. Cost: 3 AP & 1 potion. Heals 50 hp.</div>");
    }, function () {
        $("div").remove(".spell-info");
    });

    //Use a potion
    $("#potion").click(function () {
        var attackSound = new Audio("./sound/heal.wav");

        //Only use potion if player's ap is at least 3, if player is hurt and if player has potions in inventory
        if (player.hp < player.maxhp && player.ap >= 3 && player.inventory.potions > 0) {
            attackSound.play();
            removeFromInventory("potions");

            // Calculate how much the player can heal (can't heal more than max health)
            var healThisMuch = 50;
            if (player.maxhp < (player.hp + 50)) {
                healThisMuch -= (player.hp + 50) % player.maxhp;
            }

            //Update player ap and hp
            player.ap -= 3;
            player.hp += healThisMuch;

            $("#battle-options > button").attr("disabled", true); //Disable buttons
            $("div").remove(".spell-info"); //Remove hover-info (otherwise won't be remove when button gets disabled)

            //Animate heal
            $('<div class="particle heal"></div>')
                .animate({
                    top: '250'
                }, 'slow', 'swing', function () {

                    //When animation is complete, update ap and hp in dom elements
                    $("#playerap").text(player.ap + "/" + player.maxap);
                    $("#playerhp").text(player.hp + "/" + player.maxhp);
                    $("#dmgPlayer").text('+' + healThisMuch).removeClass('red').addClass('green').fadeIn();
                    $("#dmgPlayer").fadeOut();
                    $(this).remove();

                    checkIfBtnDisable(); //Enable or disable buttons
                    nextTurnOrEndBattle(); //Check if enemy's turn
                })
                .appendTo($("#battle-field"));
        }
    });

    /** --------------------- End turn button event listeners ------------------------ */

    //Start enemy's turn
    $("#endturn").click(function () {
        $("div").remove(".spell-info");
        window.setTimeout(function () {
            battleAction(1);
        }, 100);
    });

    /**
    * Do all battle action including showing/hiding ability buttons, showing attack animations,
    * updating hp and ap for both user and enemy. Alternate between enemy and player turn based on ap available
    *
    * @param integer turn, 0 if player's turn and 1 if enemy's turn
    *
    * @return void
    */
    function battleAction(turn) {
        player.ap = player.maxap;

        $("#playerap").text(player.ap + "/" + player.maxap);
        $("#enemyap").text(enemies[0].ap + "/" + enemies[0].maxap);

        //Player's turn, display ability buttons
        if (turn === 0) {
            console.log("player's turn");
            $("#battle h3").text("Your turn");
            $("#battle-options > button").show(); //Show ability buttons
            checkIfBtnDisable(); //Enable or disable buttons

        //Enemy's turn
        } else if (turn === 1) {
            console.log("enemy's turn");
            $("#battle h3").text("Enemy's turn");

            $("#battle-options > button").hide(); //Hide ability buttons
            $("div").remove(".spell-info");

            //Calculate damage and chance to miss
            var damage = enemies[0].attack();
            var randNr = random(0, 10);
            var dmgOutput;

            if (randNr % 5 === 0) {
                damage = 0;
                dmgOutput = "miss";
            } else {
                dmgOutput = "-" + damage;
            }

            //Update player hp and enemy ap
            player.hp -= damage;
            enemies[0].ap -= 5;

            //Attack animation for goblins
            if (enemies[0].enemyType === 'goblin') {
                var attackSoundGoblin = new Audio("./sound/axe.wav");
                attackSoundGoblin.play();

                $('<div class="particle axe"></div>')
                    .animate({
                        left: '60'
                    }, 500, 'swing', function () {
                        //When animation is complete update player hp and enemy ap
                        $("#dmgPlayer").removeClass('green').addClass('red').text(dmgOutput).fadeIn();
                        $("#dmgPlayer").fadeOut();
                        $("#enemyap").text(enemies[0].ap + "/" + enemies[0].maxap);
                        $("#playerhp").text(player.hp + "/" + player.maxhp);
                        $(this).remove(":first");
                    })
                    .appendTo($("#battle-field"));

            //Attack animation for dragons
            } else if (enemies[0].enemyType === 'dragon') {
                var attackSoundDragon = new Audio("./sound/fire.wav");
                attackSoundDragon.play();

                $('<div class="particle foe"></div>')
                    .animate({
                        left: '60'
                    }, 500, 'swing', function () {
                        //When animation is complete update player hp and enemy ap
                        $("#dmgPlayer").removeClass('green').addClass('red').text(dmgOutput).fadeIn();
                        $("#dmgPlayer").fadeOut();
                        $("#enemyap").text(enemies[0].ap + "/" + enemies[0].maxap);
                        $("#playerhp").text(player.hp + "/" + player.maxhp);
                        $(this).remove(":first");
                    })
                    .appendTo($("#battle-field"));

            //Attack animation for knights
            } else {
                var attackSoundKnight = new Audio("./sound/sword.wav");
                $('.enemy').addClass('flip-attack');

                window.setTimeout(function () {
                    //When animation is complete update player hp and enemy ap
                    attackSoundKnight.play();
                    $("#dmgPlayer").removeClass('green').addClass('red').text(dmgOutput).fadeIn();
                    $("#dmgPlayer").fadeOut();
                    $("#enemyap").text(enemies[0].ap + "/" + enemies[0].maxap);
                    $("#playerhp").text(player.hp + "/" + player.maxhp);
                }, 500);


                window.setTimeout(function () {
                    $('.enemy').removeClass('flip-attack');
                }, 1000);

            }
            //Check if player's turn or enemy's turn again
            nextTurnOrEndBattle(1);
        }
    }

    /**
    * Draw the battle field
    * @return void
    */
    function drawBattle() {
        $('div').remove('.particle'); //Remove any left over particles from last fight

        //Battle music
        battleMusic.play();
        battleMusic.loop = true;
        battleMusic.volume = 0.2;

        //Remember the player's current hp and nr of potions
        currentHP = player.hp;
        currentPotions = player.inventory.potions !== undefined ? player.inventory.potions : 0;

        //Create a new enemy if not already created. Type of enemy is random
        if (enemies[0] === undefined) {
            var typeOfEnemy, randomNr = random(0, 8);

            if (randomNr < 3) {
                typeOfEnemy = "goblin";
            } else if (randomNr < 6) {
                typeOfEnemy = "dragon";
            } else {
                typeOfEnemy = "knight";
            }

            var monster = new Enemy(typeOfEnemy);
            enemies.push(monster);
        }

        //Show battle field
        $('#info').hide();
        $('#battle').show();

        //Show ap and hp for player and enemy
        $("#playerhp").text(player.hp + "/" + player.maxhp);
        $("#playerap").text(player.ap + "/" + player.maxap);
        $("#enemyhp").text(enemies[0].hp + "/" + enemies[0].maxhp);
        $("#enemyap").text(enemies[0].ap + "/" + enemies[0].maxap);

        //Start battle, player goes first (0)
        battleAction(0);
    }

    /**
    * Show info before the battle (display that player has been ambushed)
    * @return void
    */
    function battleInfo() {
        inBattle = true;
        $('#content').hide();
        $('#info').show().html("<div id='infoinner'><h2>Ambush!</h2><p>You have been ambushed. Prepare to fight!<p></div>");

        bgMusic.pause();

        //Draw the battle field after 3 seconds
        window.setTimeout(function () {
            $('#info').fadeOut('slow', function () {
                drawBattle();
            });
        }, 3000);

    }

    /**
    * What happens when you interact with an interactable item
    * @param object item, the item to interact with
    *
    * @return void
    */
    function itemAction(item) {
        //If object is marked as used
        if (item.status === 'used') {
            console.log("Nothing more to see here");
            $(output).html("<p>Nothing more to see here</p>").show();
            failMusic.play();
            window.setTimeout(function () {
                $(output).fadeOut('slow');
            }, 2500);
        //If object is not marked as used
        } else {
            //If object is not empty, run item interaction function
            if (item.inside !== '') {
                item.interaction();

            //If object is empty, display a message
            } else {
                failMusic.play();
                $(output).html("<p>You look inside the " + item.type + ". The " + item.type + " is empty</p>").show();
                window.setTimeout(function () {
                    $(output).fadeOut('slow');
                }, 2500);
            }
        }
    }

    /**
    * Check if there's a character or an interactable item next to the player
    * @param int moveLeft, the nr of steps left to check for item or character
    * @param int moveTop, the nr of steps top to check for item or character
    *
    * @return boolean interactable - true (can interact) or false (can't interact)
    */
    var canInteract = function (moveLeft, moveTop) {
        var interactable, posX, posY, tile;

        posX = posLeft + moveLeft;
        posY = posTop + moveTop;
        tile = posX + posY * gridSize;

        //Check if an item is located on the given tile position
        if (itemPositions.indexOf(tile) > -1) {
            //Get the item located nearby and send it to itemAction to run interaction
            Object.keys(currentRoom.items).forEach(function (key, val) {
                if (currentRoom.items[key].positionX === posX && currentRoom.items[key].positionY === posY) {
                    itemAction(currentRoom.items[key]);
                }
            });
            interactable = true;

        //Check if a character is located on the given tile position
        } else if (characterPositions.indexOf(tile) > -1) {
            //Get the character located nearby and run its interaction
            Object.keys(currentRoom.characters).forEach(function (key, val) {
                if (currentRoom.characters[key].positionX === posX && currentRoom.characters[key].positionY === posY) {
                    currentRoom.characters[key].interaction();
                }
            });
            interactable = true;

        //Else return false
        } else {
            interactable = false;
        }

        return interactable;
    };

    /** Check if baddie can move in the given direction
    * @param integer moveLeft, the nr of steps left baddie wants to move
    * @param integer moveTop, the nr of steps top baddie wants to move
    *
    * @return boolean movable - true (can move) or false (can't move)
    */
    var isBaddieMovable = function (moveLeft, moveTop) {
        var tile, tilePos, newLeft, newTop, movable, stayInPos;
        var nextPos, nextTile;

        //Calculate tile positions
        newLeft = posLeft + moveLeft;
        newTop = posTop + moveTop;
        movable = false;
        stayInPos = false;
        tilePos = newLeft + newTop * gridSize;
        tile = currentRoom.gameArea[tilePos];
        nextPos = tilePos + moveLeft + (gridSize * moveTop);
        nextTile = currentRoom.gameArea[nextPos];

        console.log("Move to: " + newLeft + "," + newTop);
        console.log("Tile " + tilePos + " contains " + currentRoom.gameArea[tilePos]);

        //Don't move if an ambush is on the tile badde is moving to. Run ambush
        if (currentRoom.ambush.indexOf(tilePos) > -1) {
            stayInPos = true;
            currentAmbush = tilePos;
            battleInfo(tilePos);
        }

        //If baddie is moving to an exit, run the exit interaction (e.g. loads the next room if possible)
        if (currentRoom.exits.positions.indexOf(tilePos) > -1) {
            currentRoom.exits.interaction(tilePos);
        }

        //Don't move baddie if there's an item or character on the tile baddie is trying to move to
        if (itemPositions.indexOf(tilePos) > -1 || characterPositions.indexOf(tilePos) > -1) {
            stayInPos = true;
        }

        if (stayInPos === false) {
            // Switch case on the tile value - do different things depending on what tile baddie is moving to
            switch (tile) {
            case 17: //bridge
            case 10: // empty
            case 23: //floor
            case 26: // door
            case 25: //floor
            case 30: //floor/grass
            case 27: //stairs
            case 28: //floor
            case 13: // door
                // Move baddie to tile
                movable = true;
                break;
            case 11:
                // Wall, don't move baddie
                console.log("Baddie collided with wall: %s", tile);
                break;

            case 14: //statue, impassible
                console.log("Baddie collided with the statue: %s", tile);
                break;
            case 12:
                console.log("The next tile is: " + nextTile);

                if (nextTile === 10) {
                    moveTile(tilePos, nextPos);
                    movable = true;
                    console.log("Moved a box");
                } else {
                    console.log("Can't push box - next tile is not empty");
                }
                break;
            default:
                console.log("Oh no, baddie collided with the wall");
                movable = false;
            }
        }

        return movable;
    };

    /**
    * Allow baddie to jump
    *
    * @return void
    */
    var jump = function () {

        if (isBaddieMovable(0, -1)) {

            moveBaddie(0, -1);

            window.setTimeout(function () {
                moveBaddie(0, 1);
            }, 300);
        }
    };

    /**
    * Check if player can interact with something (character or item) on the tiles next to the player
    *
    * @return void
    */
    var interact = function () {

        //Try the different tiles around the player, interaction will be triggered
        // from canInteract if there's something to interact with
        if (canInteract(0, 1) || canInteract(0, -1) || canInteract(1, 0) || canInteract(-1, 0)) {
            console.log("Item or character nearby");
        }
    };

    /**
    * Move baddie on keydown (if possible)
    */
    document.addEventListener("keydown", function (event) {
        var key;

        key = event.keyCode || event.which;
        console.log(key + " was pressed");

        //Try to move the player (unless the player is in combat)
        if (inBattle === false) {
            switch (key) {
            case 37: //Move left
                if (isBaddieMovable(-1, 0)) {
                    moveBaddie(-1, 0);
                    baddie.className = "baddie left";
                }
                break;
            case 38: //Move up
                if (isBaddieMovable(0, -1)) {
                    moveBaddie(0, -1);
                    baddie.className = "baddie up";
                }
                break;
            case 39: //Move right
                if (isBaddieMovable(1, 0)) {
                    moveBaddie(1, 0);
                    baddie.className = "baddie right";
                }
                break;
            case 40: //Move down
                if (isBaddieMovable(0, 1)) {
                    moveBaddie(0, 1);
                    baddie.className = "baddie down";
                }
                break;

            case 32: //Try to interact

                //If player is in a dialog, hide the dialog
                if (inConv === true) {
                    $("#output").fadeOut();
                    inConv = false;
                //Else run interaction
                } else {
                    interact();
                }
                break;

            default:
                console.log("Nothing happened with the gameboard");
                return true;
            }
            event.preventDefault();
        }


    });

    /**
    * Show intro of game and initate player and room 1
    */
    function intro() {
        player = new Players(200, 10); //Create a new player
        $('#battle, #content, #output').hide();
        $('#info').html("<div id='infoinner'><h2>A Mouseterious Adventure - Episode I</h2><p>You have been called to the castle by the professor, he wants you to do something for him but you're not quite sure what that something is yet.</p><p>Move around using the arrow keys and interact with people and objects using space bar.</p><p>Press start when you're ready to start your adventure.</p></div>");
        $("<button id='play'></button>").text("Play").appendTo($('#infoinner'));

        //Start game when clicking on button
        $("#play").click(function () {
            bgMusic.play();
            bgMusic.volume = 0.8;
            bgMusic.loop = true;
            $('#info').hide();
            initArea(1, 'start');
        });

    }

    intro();

});
