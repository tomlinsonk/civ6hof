const MAX_GAMES_DISPLAYED = 50;
const titles = ["Augustus Caesar", "Hammurabi", "Abraham Lincoln", "Charlemagne",
                "Winston Churchill", "Nelson Mandela", "Marcus Aurelius", "Joan of Arc",
                "Charles de Gaulle", "Simón Bolívar", "Lech Wałęsa", "Ivan the Terrible",
                "Henry VIII", "Herbert Hoover", "Louis XVI", "Neville Chamberlain",
                "Andrew Jackson", "Nero", "Warren G. Harding", "Ethelred the Unready", "Dan Quayle"];

function getTitle(score) {
  var index = titles.length - 1
  if (score >= 2500) {
    index = 0;
  } else if (score >= 2000) {
    index = Math.floor((score - 2000) / 250);
  } else if (score >= 300) {
    index = index - 1 - Math.floor((score - 300) / 100);
  }
  return titles[index];
}


var db = firebase.firestore();

function signIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

function signOut() {
  firebase.auth().signOut();
}

function initFirebaseAuth() {
  firebase.auth().onAuthStateChanged(authStateObserver);
}

function isUserSignedIn() {
  return !!firebase.auth().currentUser;
}

function loadRecentVictories() {
  var gamesRef = db.collection('games').where('public', '==', true);
  gamesRef.onSnapshot((doc) => {
    gamesRef.orderBy('date', 'desc').limit(MAX_GAMES_DISPLAYED).get().then(function(querySnapshot) {
      querySnapshot.forEach(function(doc) {
          displayRecentWin(doc.data(), doc.id);
      });
    });
  });
}

function loadHallOfFame() {
  const userRef = db.collection('users').doc(firebase.auth().currentUser.uid);
  userRef.onSnapshot((doc) => {
    if (isUserSignedIn()) {
      const games = doc.data().games
      for (var i = 0; i < games.length; i++) {
        games[i].get().then(function(doc) {
          displayHallOfFameWin(doc.data(), doc.id);
        });
      } 
    }
  });
}

function onAddWin(e) {
  newVictoryPopupElement.style.display = 'block';
}

function onChangeUser() {
  var username = prompt('Enter new username:\r\n(Recent Victories will update on page reload.)');
  if (username != '') {
    $('#user-name').text(username);
    db.collection('users').doc(firebase.auth().currentUser.uid).update({'name': username});
  }
}

function onNewVictorySubmit(e) {
  e.preventDefault();
  const formData = new FormData(e.target);
  const userRef = db.collection('users').doc(firebase.auth().currentUser.uid);
  const public = formData.get('visibility') != 'private';

  db.collection('games').add({
    'date': Date.now(),
    'difficulty': formData.get('difficulty'),
    'leader': formData.get('civ'),
    'score': formData.get('score'),
    'type': formData.get('type'),
    'turn': formData.get('turn'),
    'map': formData.get('map'),
    'speed': formData.get('speed'),
    'size': formData.get('size'),
    'start-era': formData.get('start-era'),
    'user': userRef,
    'public': public
  }).then(function(docRef) {
    userRef.update({
      games: firebase.firestore.FieldValue.arrayUnion(docRef)
    });
  });
  newVictoryPopupElement.style.display = 'none';
}

function authStateObserver(user) {
  if (user) { // Signed in
    const userRef = db.collection('users').doc(user.uid);
    userRef.get().then((docSnapshot) => {
        if (!docSnapshot.exists) {
          userRef.set({name: user.displayName, games: []}); // create the document
        }
    });

    userRef.get().then((doc) => {
      userNameElement.textContent = doc.data().name;
    });

    userNameElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');
    changeUsernameElement.removeAttribute('hidden')
    signInButtonElement.setAttribute('hidden', 'true');

    logInPromptContainerElement.setAttribute('hidden', 'true');
    loadHallOfFame();
    hallOfFameContainerElement.removeAttribute('hidden');
  } else { // Signed out
    userNameElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');
    changeUsernameElement.setAttribute('hidden', 'true');
    signInButtonElement.removeAttribute('hidden');

    logInPromptContainerElement.removeAttribute('hidden');
    hallOfFameContainerElement.setAttribute('hidden', 'true');
    $('div.hof-win-container').remove();

    newVictoryPopupElement.style.display = 'none';
  }
}

// Template for win entry.
var RECENT_WIN_TEMPLATE =
    '<div class="win-container tooltip">' +
      '<span class="tooltiptext"></span>' +
      '<table class="win-entry">' +
        '<tr>' + 
          '<td class="user"></td>' +
          '<td class="score"></td>' +
          '<td class="civ"></td>' +
          '<td class="leader-img-container"><img class="win-icon leader-img"></td>' +
          '<td class="date" hidden></td>' + 
        '</tr>' +
      '</table>' +
      '<span class="win-icon-container"><img class="win-icon type-img"><img class="win-icon difficulty-img"><img class="win-icon speed-img"></span>' +
      '<span class="date-label"></span>'
    '</div>';

// Displays a win entry in the UI.
function displayRecentWin(data, key) {
  var div = document.getElementById('recent-' + key);
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = RECENT_WIN_TEMPLATE;
    div = container.firstChild;
    div.setAttribute('id', 'recent-' + key);

    var children = allWinListElement.querySelectorAll('.win-container');

    var firstChildBefore = null;
    for (var i=0; i < children.length; i++) { 
      if (parseInt(children[i].querySelector('.date').textContent) < data.date) {
        firstChildBefore = children[i];
        break;
      }
    }

    if (firstChildBefore != null) {
      allWinListElement.insertBefore(div, firstChildBefore);
    } else {
      allWinListElement.appendChild(div);
    }

    var children = allWinListElement.querySelectorAll('.win-container');
    if (children.length > MAX_GAMES_DISPLAYED) {
      allWinListElement.removeChild(children[children.length - 1]);
    }
  }
  
  if (data.user == null) {
    div.querySelector('.user').textContent = 'Anonymous';
  } else {
    data.user.get().then(function(doc) {
      div.querySelector('.user').textContent = doc.data().name;
    });
  }
  
  div.querySelector('.leader-img').src = 'images/leader-icons/' + data.leader + '.png';
  div.querySelector('.type-img').src = 'images/victory-icons/' + data.type + '.png';
  div.querySelector('.difficulty-img').src = 'images/difficulty-icons/' + data.difficulty + '.png';
  div.querySelector('.speed-img').src = 'images/speed-icons/' + data.speed + '.png';

  div.querySelector('.score').textContent = data.score;
  div.querySelector('.civ').textContent = data.leader.replace(/_/g, ' ');
  div.querySelector('.date').textContent = data.date;
  div.querySelector('.tooltiptext').textContent = 'Turn: ' + data.turn + '\r\n' +
                                                  'Map: ' + data.map + '\r\n' +
                                                  'Size: ' + data.size + '\r\n' +
                                                  'Start Era: ' + data['start-era'];

  var date = new Date(data.date) 
  div.querySelector('.date-label').textContent = date.toLocaleString();
}

var HOF_TEMPLATE =
    '<div class="win-container hof-win-container tooltip">' +
      '<img class="delete-win-entry" src="images/delete.png">' + 
      '<span class="tooltiptext"></span>' +
      '<table class="win-entry">' +
        '<tr>' + 
          '<td class="score"></td> <td class="title"></td>' +
          '<td class="civ"></td>' +
          '<td class="leader-img-container"><img class="leader-img"></td>' +
        '</tr>' +
      '</table>' +
      '<span class="win-icon-container"><img class="win-icon type-img"><img class="win-icon difficulty-img"><img class="win-icon speed-img"></span>' +
      '<span class="date-label"></span>' +
    '</div>';

function displayHallOfFameWin(data, key) {
  console.log('Displaying hof win');
  var div = document.getElementById('hof-' + key);
  if (!div) {
    var container = document.createElement('div');
    container.innerHTML = HOF_TEMPLATE;

    div = container.firstChild;
    div.setAttribute('id', 'hof-' + key);

    var children = hallofFameListElement.querySelectorAll('.win-container');

    var firstChildBefore = null;
    for (var i=0; i < children.length; i++) { 
      if (parseInt(children[i].querySelector('.score').textContent) < data.score) {
        firstChildBefore = children[i];
        break;
      }
    }

    if (firstChildBefore != null) {
      hallofFameListElement.insertBefore(div, firstChildBefore);
    } else {
      hallofFameListElement.appendChild(div);
    }
  }

  div.querySelector('.leader-img').src = 'images/leader-icons/' + data.leader + '.png';
  div.querySelector('.type-img').src = 'images/victory-icons/' + data.type + '.png';
  div.querySelector('.difficulty-img').src = 'images/difficulty-icons/' + data.difficulty + '.png';
  div.querySelector('.speed-img').src = 'images/speed-icons/' + data.speed + '.png';

  div.querySelector('.title').textContent = getTitle(parseInt(data.score));
  div.querySelector('.score').textContent = data.score;
  div.querySelector('.civ').textContent = data.leader.replace(/_/g, ' ');
  div.querySelector('.tooltiptext').textContent = 'Turn: ' + data.turn + '\r\n' +
                                                  'Map: ' + data.map + '\r\n' +
                                                  'Size: ' + data.size + '\r\n' +
                                                  'Start Era: ' + data['start-era'];

  var date = new Date(data.date); 
  div.querySelector('.date-label').textContent = date.toLocaleDateString();

  const deleteButton = div.querySelector('.delete-win-entry');
  var handler = function () {
    if (div.hasAttribute('data-deleted')) return;

    div.setAttribute('data-deleted', 'true');
    if (confirm('Are you sure you want to permantently delete this victory?')) {
      const gameRef = db.collection('games').doc(key);
      data.user.update({
        games: firebase.firestore.FieldValue.arrayRemove(gameRef)
      });
      gameRef.delete();
      div.parentElement.removeChild(div);
      const recentEntry = document.getElementById('recent-' + key);
      if (recentEntry != null) {
        recentEntry.parentElement.removeChild(recentEntry);
      }
    }
  };

  deleteButton.addEventListener('click', handler);
}

// Checks that the Firebase SDK has been correctly setup and configured.
function checkSetup() {
  if (!window.firebase || !(firebase.app instanceof Function) || !firebase.app().options) {
    window.alert('You have not configured and imported the Firebase SDK. ' +
        'Make sure you go through the codelab setup instructions and make ' +
        'sure you are running the codelab using `firebase serve`');
  }
}

// Checks that Firebase has been imported.
checkSetup();

// Shortcuts to DOM Elements.
var allWinListElement = document.getElementById('all-wins');
var hallofFameListElement = document.getElementById('hall-of-fame');
var addWinButtonElement = document.getElementById('add-win');
var userNameElement = document.getElementById('user-name');
var signInButtonElement = document.getElementById('sign-in');
var changeUsernameElement = document.getElementById('change-username');
var signOutButtonElement = document.getElementById('sign-out');
var signInSnackbarElement = document.getElementById('must-signin-snackbar');
var newVictoryPopupElement = document.getElementById('new-victory-popup');
var newVictoryFormElement = document.getElementById('new-victory-form');
var hallOfFameContainerElement = document.getElementById('hall-of-fame-container');
var logInPromptContainerElement = document.getElementById('login-prompt-container');

changeUsernameElement.addEventListener('click', onChangeUser);
addWinButtonElement.addEventListener('click', onAddWin);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);
newVictoryFormElement.addEventListener('submit', onNewVictorySubmit)

// initialize Firebase
initFirebaseAuth();

loadRecentVictories();