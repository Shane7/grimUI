/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/// <reference path="../vendor/jquery.d.ts" />

module Login {
    /* Both Character Selection and Character Creation Variables */

    var loginToken = null;

    var $modalWrapper = $('#modal-wrapper');
    var $modal = $('#modal');
    var $characters = $('#characters');

    /* Server Selection Variables */

  
    
    class ServerPlayerCounts
    {
        Arthurians: number = 0;
        TuathaDeDanann: number = 0;
        Viking: number = 0;

        get Total(): number
        {
            return this.Arthurians + this.TuathaDeDanann + this.Viking;
        }

        constructor(arthurians: number, tuathaDeDanann: number, viking: number)
        {
            this.Arthurians = arthurians;
            this.TuathaDeDanann = tuathaDeDanann;
            this.Viking = viking;
        }

 
    }

    class Server {
        Name: string;
        Host: string;
        IsOnline: boolean = false;

        private PlayerCounts: ServerPlayerCounts = new ServerPlayerCounts(0, 0, 0);
        private characters: any = null;
        private races: any = null;

        //Wrapping player counts so if the underlying class chages we don't break anyone who ref's then via the server class.
        get Arthurians(): number {
            return this.PlayerCounts.Arthurians;
        }

        get TuathaDeDanann(): number {
            return this.PlayerCounts.TuathaDeDanann;
        }

        get Viking(): number {
            return this.PlayerCounts.Viking;
        }

        get Total(): number {
            return this.PlayerCounts.Total;
        }

        //TODO: create a characters object and convert this to a delay loading Array<Character>(), for now, I'll add this to be compatable with the current code...
        get Characters(): any {
            return this.characters;
        }
        //TODO: should be able to remove this when the characters are loaded by the server object
        set Characters(characters: any) {
            this.characters = characters;
        }

        //TODO: this needs the same delay load treatment as the characters list..
        get Races(): any {
            return this.races;
        }
        //TODO: should be able to remove this when the races are loaded by the server object
        set Races(races: any) {
            this.races = races;
        }

        /*
        * Overloading constructors is a bit strange in typescript, you can only overload the sig, not he body
        * The bottom most constructor appears to need to account for all possible parameters hence the ? on name and host
        * the server data version is needed so I can build a class from and old-style server object. 
        */
        constructor(name: string, host: string);
        constructor(serverData: any);
        constructor(serverData: any, name?: string, host?: string) {
            if (serverData) {
                //assumming the right object was passed in
                this.Name = serverData.name;
                this.Host = serverData.host;
                this.IsOnline = serverData.isOnline;

                if (serverData.playerCounts) {
                    this.PlayerCounts.Arthurians = (serverData.playerCounts.arthurians || 0);
                    this.PlayerCounts.TuathaDeDanann = (serverData.playerCounts.tuathaDeDanann || 0);
                    this.PlayerCounts.Viking = (serverData.playerCounts.viking || 0);
                }
            }
            else {
                this.Name = name;
                this.Host = host;
            }
        }

        UpdateAsync(updateCompleteCallback, eventData) {

            var delay = 5000;

            $.ajax({
                type: 'GET',
                url: Server.getServerApiUrl(this.Host) + '/game/players',
                timeout: delay
            }).done((data) => {
                this.IsOnline = true;

                this.PlayerCounts.Arthurians = (data.arthurians || 0);
                this.PlayerCounts.TuathaDeDanann = (data.tuathaDeDanann || 0);
                this.PlayerCounts.Viking = (data.vikings || 0);

                if (updateCompleteCallback)
                    updateCompleteCallback(this, eventData);
                
            }).fail(() => {
                    this.IsOnline = false;

                    if (updateCompleteCallback)
                        updateCompleteCallback(this, eventData);
                });
        }

        private static getServerApiUrl(host: string) {
            return 'http://' + host + ':8000/api';
        }

        static GetAllAsync(completeCallback) {
            var allServers = new Array<Server>();

            $.ajax({
                type: 'GET',
                url: Server.getServerApiUrl('chat.camelotunchained.com') + '/game/servers',
                timeout: 6000
            }).done((data) => {

                    var servers = [
                        { name: 'localhost', host: 'localhost', isOnline: true, playerCounts: { arthurians: 0, tuathaDeDanann: 0, viking: 0, total: 0 } }
                    ];

                    servers = data;

                    //alert(data);

                    //I don't quit understand the magic of loading the original list, so I'll loop through turning old servers into the new server type
                    //maybe someone can figure out how to go directly to a typed array?
                    servers.forEach((server) => {
                        allServers.push(new Server(server));
                    });

                if (completeCallback)
                    completeCallback(allServers);

            }).fail(Server.GetAllAsync);
        }
        
    } 

    var availableServers = new Array<Server>();

    var selectedServer:Server = null;

    var serverTimeouts = [];

    var $serversModalContainer = null;

    var serverCharacterRequests = {};

    /* Character Selection Variables */

    var $characterSelection = $('#character-selection');
    var $previousButton = $('#btn-previous');
    var $nextButton = $('#btn-next');
    var $serversButton = $('#btn-servers');
    var $deleteButton = $('#btn-delete');
    var $createNewButton = $('#btn-create-new');
    var $startButton = $('#btn-start');
    var $selectedCharacter = null;

    /* Character Creation Variables */

    var $characterCreation = $('#character-creation');
    var $characterCreationRealms = $('#character-creation-realms');
    var $arthuriansButton = $('#btn-arthurians');
    var $tddButton = $('#btn-tdd');
    var $vikingsButton = $('#btn-vikings');
    var $characterCreationRaces = $('.character-creation-race');
    var $characterCreationBottom = $('#character-creation-bottom');
    var $backButton = $('#btn-back');
    var $characterName = $('#character-name');
    var $createButton = $('#btn-create');

    var realms = ['TDD', 'Viking', 'Arthurian'];

    var selectedRealm = null;
    var selectedRace = null;

    var serverRacesRequest = null;

    /* Both Character Selection and Character Creation Events */

    $modalWrapper.click(() => {
        if (!$('#server-select').is(':visible')) {
            hideModal();
        }
    });

    $modal.click(() => { return false; });

    /* Character Selection Events */

    $previousButton.click(() => selectCharacter(getPreviousCharacter()));

    $nextButton.click(() => selectCharacter(getNextCharacter()));

    $serversButton.click(showServerSelection);

    $deleteButton.click(() => {
        var deleteModal = createDeleteModal();

        if (!deleteModal) return;

        showModal(deleteModal);
    });

    $createNewButton.click(showCharacterCreationPage);

    $startButton.click(() => {
        var character = {
            id: $selectedCharacter.data('character-id'),
            name: $selectedCharacter.data('character-name')
        };

        $characterSelection.fadeOut(() => connect(character));
    });

    /* Character Creation Events */

    $arthuriansButton.click(() => selectRealm(realms[2], false));

    $tddButton.click(() => selectRealm(realms[0], false));

    $vikingsButton.click(() => selectRealm(realms[1], false));

    $characterCreationRaces.click(selectRace);

    $backButton.click(() => {
        selectedRealm = null;

        $characterCreation.fadeOut(() => {
            if ($characters.children().length) {
                showCharacterSelect();
            } else {
                showServerSelection();
            }
        });
    });

    $characterName.click(function() { $(this).select(); } );

    $characterName.bind('propertychange keyup input paste', function() {
        var name = $(this).val();

        $createButton.prop('disabled', name.length < 1 || name.length > 100);
    });

    $createButton.click(createCharacter);

    /* Both Character Selection and Character Creation Functions */

    function initialize() {
        // Required for cross-site ajax to work on IE
        $.support.cors = true;

        loginToken = cu.HasAPI() ? cuAPI.loginToken : '';

        if (!loginToken) return;

        showServerSelection();

        Server.GetAllAsync(serversRecieved)
    }

    function serversRecieved(allServers: Array<Server>)
    {
        availableServers = allServers;
        updateServerSelection();
    }

    function hideModal(callback?) {
        $modal.animate({ 'margin-top': '-80px', 'opacity': 0 }, 200);

        if (_.isFunction(callback)) {
            $modalWrapper.fadeOut(300, callback);
        } else {
            $modalWrapper.fadeOut(300);
        }
    }

    function showModal(modalContent) {
        $modal.empty().append(modalContent);

        $modalWrapper.css('display', 'none');

        $modal.css({ 'margin-top': '-80px', 'opacity': 0 });

        $modalWrapper.fadeIn(200);

        $modal.animate({ 'margin-top': '-165px', 'opacity': 1 }, 300);
    }

    function connect(character) {
        if (_.isUndefined(selectedServer) || !_.isString(selectedServer.Host)) {
            showModal(createErrorModal('No server selected.'));
        } else if (_.isUndefined(character) || !_.isString(character.id)) {
            showModal(createErrorModal('No character selected.'));
        } else {
            if (cu.HasAPI()) {
                cuAPI.Connect(selectedServer.Host, character.id);
            } else {
                showModal(createErrorModal('Connected to: ' + selectedServer.Host + ' - character: ' + character.id));
            }
        }
    }

    function getSelectedServerApiUrl() {
        return getServerApiUrl(selectedServer);
    }

    function getSecureSelectedServerApiUrl() {
        return getSecureServerApiUrl(selectedServer);
    }

    //TODO remove this from the global scope if posible its in server now
    function getServerApiUrl(server: Server) {
        return 'http://' + server.Host + ':8000/api';
    }

    function getSecureServerApiUrl(server: Server) {
        if (server.Host === 'localhost') return getServerApiUrl(server);
        return 'https://' + server.Host + ':4443/api';
    }

    /* Server Selection Functions */

    function showServerSelection() {
        selectedServer = null;

        $characterSelection.fadeOut(() => {
            if (!$serversModalContainer) {
                $serversModalContainer = createServersModal();
            } else {
                updateServerSelection();
            }

            showModal($serversModalContainer);
        });
    }

    function updateServerSelection() {
        var $tbody = $serversModalContainer['$content']['$table']['$tbody'];

        $tbody.empty();

        availableServers.forEach((server) => {
            var row = createServerModalRow(server);

            row.$row.appendTo($tbody);

            updateServerEntry(server, row);
        });
    }

    function createServersModal() {
        var $container = $('<div class="modal-container"></div>');

        var $content = $container['$content'] = $('<div class="modal-content"></div>').appendTo($container);

        var $table = $content['$table'] = $('<table id="server-select"></table>').appendTo($content);

        $('<thead><tr>' +
            '<th class="title">Choose your server</th>' +
            '<th class="arthurians">Arthurians</th>' +
            '<th class="tdd">Tuatha</th>' +
            '<th class="vikings">Vikings</th>' +
            '<th class="online">Online</th>' +
            '</tr></thead>').appendTo($table);

        var $tbody = $table['$tbody'] = $('<tbody></tbody>').appendTo($table);

        $table['$tfoot'] = $('<tfoot></tfoot>').appendTo($table);

        availableServers.forEach((server) => {
            createServerModalRow(server).$row.appendTo($tbody);
        });

        return $container;
    }

    function createServerModalRow(server: Server) {
        var $row = $('<tr></tr>');

        $row[0].onclick = () => trySelectServer(server);

        if (!server.IsOnline) {
            $row.addClass('offline');
        }

        $('<td class="name">' + _.escape(server.Name) + '</td>').appendTo($row);

        var $arthurians = $('<td class="arthurians">?</td>').appendTo($row);
        var $tdd = $('<td class="tdd">?</td>').appendTo($row);
        var $vikings = $('<td class="vikings">?</td>').appendTo($row);
        var $total = $('<td class="online">?</td>').appendTo($row);

        $arthurians.text(server.Arthurians);
        $tdd.text(server.TuathaDeDanann);
        $vikings.text(server.Viking);
        $total.text(server.Total);
        

        return { $row: $row, $arthurians: $arthurians, $tdd: $tdd, $vikings: $vikings, $total: $total };
    }

    function updateServerEntry(server: Server, row) {
        server.UpdateAsync(doUpdateServerEntry, row);
    }

    function doUpdateServerEntry(server: Server, row) {
        var start = new Date(); //TODO this used to take into account how long the update took, prob should pass the start time in as well...
        var delay = 5000;

        if (server.IsOnline) {
            row.$row.removeClass('offline');
            row.$arthurians.text(server.Arthurians);
            row.$tdd.text(server.TuathaDeDanann);
            row.$vikings.text(server.Viking);
            row.$total.text(server.Total);

            if (!selectedServer) {
                var elapsed = new Date().getTime() - start.getTime();

                serverTimeouts.push(setTimeout(() => updateServerEntry(server, row), delay - elapsed));
            }
        }
        else
        {
            row.$row.addClass('offline');
            row.$arthurians.text('?');
            row.$tdd.text('?');
            row.$vikings.text('?');
            row.$total.text('?');

            if (!selectedServer) {
                var elapsed = new Date().getTime() - start.getTime();

                serverTimeouts.push(setTimeout(() => updateServerEntry(server, row), delay - elapsed));
            }
        }
    }

    function trySelectServer(server: Server) {
        if (!server.IsOnline) {
            return;
        }

        var request = serverCharacterRequests[server.Host];

        if (!request) {
            var $tfoot = $serversModalContainer['$content']['$table']['$tfoot'];

            $tfoot.empty();

            var $row = $('<tr></tr>').appendTo($tfoot);

            var text = 'Loading..';

            var $td = $('<td colspan="5"></td>').text(text).appendTo($row);

            var attempts = 0;

            var loadingInterval = setInterval(() => {
                request = serverCharacterRequests[server.Host];

                if (request && request.readyState === 4) {
                } else if (++attempts > 50) {
                    clearInterval(loadingInterval);
                } else {
                    text += '.';

                    $td.text(text);
                }
            }, 500);

            var delay = 5000;

            serverCharacterRequests[server.Host] = $.ajax({
                type: 'GET',
                url: getSecureServerApiUrl(server) + '/characters?loginToken=' + loginToken,
                timeout: delay
            }).done((data) => {
                server.Characters = data;

                serverCharacterRequests[server.Host] = null;

                clearInterval(loadingInterval);

                $row.remove();

                selectServer(server);
            }).fail(() => {
                serverCharacterRequests[server.Host] = null;

                clearInterval(loadingInterval);

                $td.text('Failed to load characters. Please try again.');
            });
        }
    }

    function selectServer(server: Server) {
        serverTimeouts.forEach(timeout => clearTimeout(timeout));
        serverTimeouts = [];

        //selectedServer = servers.filter((s) => {
        selectedServer = availableServers.filter((s) => {
            return s.Name === server.Name;
        })[0];

        if (_.isUndefined(selectedServer)) {
            return;
        }

        hideModal(() => {
            if (selectedServer.Characters && selectedServer.Characters.length) {
                showCharacterSelect();
            } else {
                showCharacterCreationPage();
            }
        });
    }

    /* Character Selection Functions */

    function showCharacterCreationPage() {
        getRaces();

        $characterCreationRaces.hide();

        $characterCreationBottom.hide();

        $characterSelection.fadeOut(() => {
            $characterCreation.fadeIn();

            $characterCreationRealms.animate({ 'top': '40%' });
        });
    }

    function showCharacterSelect() {
        $characters.empty();

        $selectedCharacter = null;

        selectedServer.Characters.forEach((character, index) => {
            var raceCssClass;

            try {
                raceCssClass = getRaceCssClass(character.race);
            } catch (ex) {
                alert(ex);
            }

            if (typeof raceCssClass == 'undefined') {
                raceCssClass = getRaceCssClass('Tuatha');
            }

            var $character = $('<li class="character" data-character-id="' + character.id + '" data-character-name="' + _.escape(character.name) + '"></li>').appendTo($characters);

            var $portrait = $('<div class="' + raceCssClass + '"></div>').css('background', getRaceBackgroundStyle(raceCssClass)).appendTo($character);

            $('<span class="character-name">' + _.escape(character.name) + '</span>').appendTo($portrait);

            if (index === 0) {
                $selectedCharacter = $character.fadeIn().css('display', 'inline');
            }
        });

        if (selectedServer.Characters.length > 1) {
            $previousButton.fadeIn();
            $nextButton.fadeIn();
        }

        $characterSelection.fadeIn();
    }

    function findRaceCssClass(raceValue) {
        var race = selectedServer.Races.filter(r => r.value === raceValue)[0];
        if (!race) {
            throw new Error('Race ' + raceValue + ' does not exist');
        }
        return getRaceCssClass(race);
    }

    function getRaceCssClass(race) {
        return 'char-' + race.name.toLowerCase();
    }

    function getRaceBackgroundStyle(raceFilePath) {
        return 'url("../images/login/' + raceFilePath + '.jpg") no-repeat center center';
    }

    function selectCharacter($nextSelectedCharacter) {
        if (!$nextSelectedCharacter.length) {
            $selectedCharacter.fadeIn();
        } else {
            $selectedCharacter.fadeOut(() => {
                $selectedCharacter = $nextSelectedCharacter.fadeIn();
            });
        }
    }

    function getPreviousCharacter() {
        var $previous = $selectedCharacter.prev();
        if (!$previous.length) {
            $previous = $selectedCharacter.siblings().last();
        }
        return $previous;
    }

    function getNextCharacter() {
        var $next = $selectedCharacter.next();
        if (!$next.length) {
            $next = $selectedCharacter.siblings().first();
        }
        return $next;
    }

    function createDeleteModal(): JQuery {
        var name = $selectedCharacter.data('character-name');

        var id = $selectedCharacter.data('character-id');

        var $container = $('<div class="modal-container"></div>');

        var $content = $('<div class="modal-content"></div>').appendTo($container);

        $('<h3>Are you sure you want to delete</h3>').appendTo($content);

        $('<h1 class="delete-modal-character-name">' + _.escape(name) + '</h1>').appendTo($content);

        var $buttons = $('<div class="modal-buttons"></div>').appendTo($container);

        var $yesButton = $('<button class="btn-normal btn-yes">Yes</button>').appendTo($buttons);

        $yesButton.click(() => {
            var selectedCharacter = {
                loginToken: loginToken,
                id: id
            };

            var options: JQueryAjaxSettings = {};
            options.url = getSecureSelectedServerApiUrl() + '/characters';
            options.type = 'DELETE';
            options.contentType = 'application/json; charset=utf-8';
            options.data = JSON.stringify(selectedCharacter);
            options.success = () => {
                hideModal();

                var $previous = getPreviousCharacter();

                selectedServer.Characters.splice($selectedCharacter.index(), 1);

                $selectedCharacter.remove();

                $selectedCharacter = $previous;

                if ($previous.length) {
                    var charactersCount = $characters.children().length;

                    if (charactersCount <= 1) {
                        $previousButton.fadeOut();
                        $nextButton.fadeOut();
                    }

                    $nextButton.click();
                } else {
                    showCharacterCreationPage();
                }
            };
            options.error = (xhr, status, error) => {
                hideModal(() => showModal(createErrorModal(error)));
            };
            $.ajax(options);
        });

        var $noButton = $('<button class="btn-normal btn-no">No</button>').appendTo($buttons);

        $noButton.click(hideModal);

        return $container;
    }

    /* Character Creation Functions */

    function getRaces(callback?) {
        if (serverRacesRequest) {
            serverRacesRequest.abort();
        }

        var delay = 5000;

        serverRacesRequest = $.ajax({
            type: 'GET',
            url: getServerApiUrl(selectedServer) + '/game/races',
            timeout: delay
        }).done((data) => {
            selectedServer.Races = data;

            serverRacesRequest = null;

            if (callback && _.isFunction(callback)) {
                callback();
            }
        }).fail(getRaces);
    }

    function selectRealm(realm, isForced) {
        if (selectedRealm === realm && !isForced) return;

        selectedRealm = realm;

        selectedRace = null;

        $arthuriansButton.toggleClass('active', realm === realms[2]);
        $tddButton.toggleClass('active', realm === realms[0]);
        $vikingsButton.toggleClass('active', realm === realms[1]);

        $characterCreationBottom.fadeOut();

        if (!selectedServer.Races) {
            getRaces(() => selectRealm(realm, true));
            return;
        }

        $characterCreationRealms.animate({ 'top': '0%' }, () => {
            $characterCreationRaces.fadeOut().promise().done(() => {
                var allRaceCssClasses = selectedServer.Races.map(r => getRaceCssClass(r)).join(' ');

                $characterCreationRaces.removeClass('selected ' + allRaceCssClasses);

                var racesCount = 0;

                selectedServer.Races.forEach(race => {
                    if (race.faction.name === realm) {
                        var raceCssClass = getRaceCssClass(race);

                        var $race = $($characterCreationRaces[racesCount++]).css('background', getRaceBackgroundStyle(raceCssClass));

                        $race.data('race', race.value).addClass(raceCssClass);

                        try {
                            var raceName = race.name.replace(/([a-z])([A-Z])/g, '$1 $2');

                            $race.empty().append($('<span class="character-name" > ' + raceName + ' </span >'));
                        } catch (e) {
                            alert(e);
                        } 

                        $race.fadeIn().css('display', 'inline-block');
                    }
                });

                for (var i = racesCount, length = $characterCreationRaces.length; i < length; i++) {
                    $($characterCreationRaces[i]).empty().data('race', '').fadeIn().css('display', 'inline-block');
                }
            });
        });
    }

    function selectRace() {
        var $this = $(this);

        var race = $this.data('race');

        if (!_.isNumber(race)) return;

        selectedRace = race;

        $characterCreationRaces.removeClass('selected');

        $characterCreationRaces.each((i, element) => {
            var $race = $(element);

            var raceValue = $race.data('race');

            if (raceValue) {
                var raceCssClass = findRaceCssClass(raceValue);

                $race.css('background', getRaceBackgroundStyle(raceCssClass));
            }
        });

        $this.css('background', getRaceBackgroundStyle(findRaceCssClass(race) + '-select')).addClass('selected');

        $characterCreationBottom.fadeIn();
    }

    function createCharacter() {
        $createButton.prop('disabled', true).addClass('waiting');

        var character = {
            loginToken: loginToken,
            name: $characterName.val().trim(),
            faction: selectedRealm,
            race: selectedRace
        };

        var options: JQueryAjaxSettings = {};
        options.url = getSecureSelectedServerApiUrl() + '/characters';
        options.type = 'POST';
        options.contentType = 'application/json; charset=utf-8';
        options.data = JSON.stringify(character);
        options.success = result => {
            $createButton.prop('disabled', false).removeClass('waiting');

            if (result && result.result === 0 && result.status === 'Success' && result.character && result.character.id) {
                $characterCreation.fadeOut().promise().done(() => {
                    connect(result.character);
                });
            } else {
                showModal(createErrorModal('An unknown error occurred.'));
            }
        };
        options.error = (xhr, status, error) => {
            $createButton.prop('disabled', false).removeClass('waiting');

            showModal(createErrorModal(error));
        };
        $.ajax(options);
    }

    function createErrorModal(error) {
        if (!error || !error.length) {
            error = 'An unknown error occurred.';
        }

        var $container = $('<div class="modal-container"></div>');

        var $content = $('<div class="modal-content"></div>').appendTo($container);

        $('<h2 class="modal-error">' + _.escape(error) + '</h2>').appendTo($content);

        var $buttons = $('<div class="modal-buttons"></div>').appendTo($container);

        var $okButton = $('<button class="btn-normal btn-ok">OK</button>').appendTo($buttons);

        $okButton.click(hideModal);

        return $container;
    }

    if (typeof cuAPI !== 'undefined') {
        cuAPI.OnInitialized(initialize);
    } else {
        $(initialize);
    }
}