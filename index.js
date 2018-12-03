'use strict'

let sections = {
    FOOD: 'food',
    DRINK: 'drinks',
    CAFE: 'coffee',
    SHOP: 'shops',
    SKATEPARK: 'skatepark',
    TREND: 'trending'
}

const FOURSQUARE_API_ENDPOINT = "https://api.foursquare.com/v2/";
let lat, long, placeType, findRadius;

require('dotenv').config();
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const GeoFire = require('geofire');
const firebase = require('firebase');
const app = express()

var config = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    databaseURL: process.env.DATABASEURL,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBUCKET,
    messagingSenderId: process.env.MESSAGINGSENDERID
};
firebase.initializeApp(config);


app.set('port', (process.env.PORT || 5000))

// Process application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({extended: false}))

// Process application/json
app.use(bodyParser.json())

// Index route
app.get('/', function (req, res) {
    res.send('Location bot')
})

// for Facebook verification
app.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === process.env.HUB_VERIFY_TOKEN) {
        res.send(req.query['hub.challenge'])
    }
    res.send('No sir')
})

// Spin up the server
app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'))
})

app.post('/webhook', (req, res) => {

  let body = req.body;

  if (body.object === 'page') {

    body.entry.forEach(function(entry) {
      let webhook_event = entry.messaging[0];
      // console.log(webhook_event);

      let sender_psid = webhook_event.sender.id;
      // console.log('Sender PSID: ' + sender_psid);

      if (webhook_event.message) {
        handleMessage(sender_psid, webhook_event.message);
      } else if (webhook_event.postback) {
        handlePostback(sender_psid, webhook_event.postback);
      }
    });

    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }

});


//The ifs of ifs
function handleMessage(sender_psid, received_message) {
  let response;
  console.log(received_message);
  if (received_message.text && !received_message.quick_reply) {

    switch(received_message.text) {
      case '/start':
        response = {
          "text": "Give me your location",
          "quick_replies": [
            {
              "content_type": "location"
            }
          ]
        }
        break;
      default:
        response = {
          'text': `Try /start`
        }
        break;
    }
    callSendAPI(sender_psid, response);
  } else if (received_message.attachments) {
    if (received_message.attachments[0].payload.coordinates) {
      lat = received_message.attachments[0].payload.coordinates.lat;
      long = received_message.attachments[0].payload.coordinates.long;
      response = {
        "text": "What you wanna do",
        "quick_replies": [
          {
            "content_type": "text",
            "title": "Food",
            "payload": "/food"
          },
          {
            "content_type": "text",
            "title": "Cafe!",
            "payload": "/coffee"
          },
          {
            "content_type": "text",
            "title": "Skate Park",
            "payload": "/skatepark"
          },
          {
            "content_type": "text",
            "title": "drinks",
            "payload": "/drinks"
          },
          {
            "content_type": "text",
            "title": "Trend",
            "payload": "/trend"
          },
        ],
      }
    }
    callSendAPI(sender_psid, response);
  } else if (received_message.quick_reply) {
    let payload = received_message.quick_reply.payload;
    console.log("received quick reply!");
    response = {
      "text": "How far my dude?",
      "quick_replies": [
        {
          "content_type": "text",
          "title": "5km",
          "payload": "/r5"
        },
        {
          "content_type": "text",
          "title": "25km",
          "payload": "/r25"
        },
        {
          "content_type": "text",
          "title": "50km",
          "payload": "/r50"
        },
        {
          "content_type": "text",
          "title": "All",
          "payload": "/r1000"
        }
      ]
    }
    if (payload === '/coffee') {
      callSendAPI(sender_psid, response);
      placeType = sections.CAFE;
    } else if (payload === '/food') {
      callSendAPI(sender_psid, response);
      placeType = sections.FOOD;
    } else if (payload === '/drinks') {
      callSendAPI(sender_psid, response);
      placeType = sections.DRINK;
    } else if (payload === '/trend') {
      callSendAPI(sender_psid, response);
      placeType = sections.TREND;
    } else if (payload === '/skatepark') {
      callSendAPI(sender_psid, response);
      placeType = sections.SKATEPARK;
      
    //For skate type 
    } else if (payload === '/r5' & placeType == sections.SKATEPARK) {
        findRadius = 5;
        getNearbyItems(sender_psid, lat, long, findRadius);

    } else if (payload === '/r25' & placeType == sections.SKATEPARK) {
        findRadius = 25;
        getNearbyItems(sender_psid, lat, long, findRadius);

    } else if (payload === '/r50' & placeType == sections.SKATEPARK) {
        findRadius = 50;
        getNearbyItems(sender_psid, lat, long, findRadius);

    } else if (payload === '/r1000' & placeType == sections.SKATEPARK) {
        findRadius = 100000;
        getNearbyItems(sender_psid, lat, long, findRadius);
    
    //Foursquare stuff
    } else if (payload === '/r5' ) {
      findRadius = 10000;
      findRecommendedPlace(sender_psid, lat, long, placeType, findRadius, 0);
    } else if (payload === '/r25') {
      findRadius = 25000;
      findRecommendedPlace(sender_psid, lat, long, placeType, findRadius, 0);
    } else if (payload === '/r50') {
      callSendAPI(sender_psid, {"text": "wait please"});
      findRadius = 50000;
      findRecommendedPlace(sender_psid, lat, long, placeType, findRadius, 0);
      // findRecommendedPlace(sender_psid, lat, long, placeType, findRadius, 0);
    } else if (payload === '/r1000') {
      callSendAPI(sender_psid, {"text": "wait please"});
      findRadius = 100000;
      findRecommendedPlace(sender_psid, lat, long, placeType, findRadius, 0);
    
    }
  }
}


function callSendAPI(sender_psid, response) {
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token:process.env.TOKEN},
    method: 'POST',
    json: request_body
  }, (err, res, body) => {
    if (!err) {
       console.log('message sent!')
    } else {
      console.error(response);
      console.error(err);
    }
  });
}


//find skate parks near by 
// i dont no how to push data into arrays ???? why firebase
function getNearbyItems(sender_psid, lat, long, radius) {
  var database = firebase.database(); // Ref to Firebase Database
  var geoFire = new GeoFire(database.ref('items_locations')); // Ref to 'Item Locations' table

  console.log(radius);
  let center = [lat, long];
  let geoQuery = geoFire.query({
      center: center,
      radius: radius
  });

  console.log(`Finding Items near ${center} within ${radius} km`);
  geoQuery.on("key_entered", (key, location, radius) => {
    console.log(key + " entered query at " + location + " (" + radius+ " km from center)");
        let markers = firebase.database().ref(`items/${key}`).orderByKey();
        markers.on('value', (snapshot) =>{   
            let name = snapshot.child("name").val()
            let image = snapshot.child("url").val()
            if(name.length > 0){
            let response = {
                "attachment":{
                    "type":"template",
                    "payload":{
                      "template_type":"generic",
                      "elements":[
                        {
                          "title":name,
                          "subtitle":"test",
                          "image_url":image,
                          "buttons":[
                            {
                              "type":"postback",
                              "title":"Postback Button",
                              "payload":"<POSTBACK_PAYLOAD>"
                            }
                          ]      
                        }
                      ]
                    }
                  }
            }
            callSendAPI(sender_psid, response);
          }
          else {
            let response = {
              'text': `Nothing found`
            }
            callSendAPI(sender_psid, response);
          }
        })
  });
  
}


//Find the Places 
function findRecommendedPlace (sender_psid, lat, long, type, radius, page) {
  let api = `${FOURSQUARE_API_ENDPOINT}venues/explore`;
  let response;
  const PER_PAGE = 15;
  let now = new Date();
  let currentYear = now.getFullYear();
  let currentMonth = now.getMonth() + 1;
  currentMonth = currentMonth > 9 ? currentMonth : `0${currentMonth}`
  let currentDate = now.getDate();
  currentDate = currentDate > 9 ? currentDate : `0${currentDate}`;
  request({
    uri: api,
    qs: {
      client_id: process.env.FOURSQUARE_CLIENT_ID,
      client_secret: process.env.FOURSQUARE_CLIENT_SECRET,
      ll: `${lat},${long}`,
      section: type,
      radius: radius,
      limit: PER_PAGE,
      venuePhotos: 1,
      offset: page * PER_PAGE,
      v: `${currentYear}${currentMonth}${currentDate}`
    }
  }, (err, res, body) => {
    if (err) {
      console.error('Error: ' + err);
    } else {
      let listElements = [];
      let resObj = JSON.parse(body);
      console.log("first", resObj)
      let results = resObj.response.groups[0].items;
      if (results.length > 0) {
        results.forEach(item => {
          // let imgUrl = item.venue.categories.icon.prefix + 100 + item.venue.categories.icon.suffix
          console.log(item.venue.id);
          getImage(item.venue.id);
          let element = {
            title: item.venue.name,
            subtitle: item.venue.location.address + ' ' + item.venue.location.distance,
          }
          listElements.push(element);
        })
      }
      response = {
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"generic",
            "elements":[
              {
                "title":listElements[0].title,
                "subtitle":listElements[0].subtitle,
                "image_url":"https://raw.githubusercontent.com/fbsamples/messenger-platform-samples/master/images/Messenger_Icon.png",
                "buttons":[
                  {
                    "type":"postback",
                    "title":"Postback Button",
                    "payload":"<POSTBACK_PAYLOAD>"
                  }
                ]      
              }, 
              {
                "title":listElements[1].title,
                "subtitle":listElements[1].subtitle,
                "image_url":"https://raw.githubusercontent.com/fbsamples/messenger-platform-samples/master/images/Messenger_Icon.png",
                "buttons":[
                  {
                    "type":"postback",
                    "title":"Postback Button",
                    "payload":"<POSTBACK_PAYLOAD>"
                  }
                ]      
              },
              {
                "title":listElements[2].title,
                "subtitle": listElements[2].subtitle,
                "image_url":"https://raw.githubusercontent.com/fbsamples/messenger-platform-samples/master/images/Messenger_Icon.png",
                "buttons":[
                  {
                    "type":"postback",
                    "title":"Postback Button",
                    "payload":"<POSTBACK_PAYLOAD>"
                  }
                ]      
              }
            ]
          }
        }
      }
      callSendAPI(sender_psid, response)
    }
  })
}

//This will get the venue images
function getImage(id) {
    let api = `${FOURSQUARE_API_ENDPOINT}venues/${id}`;
    let response;
    let now = new Date();
    let currentYear = now.getFullYear();
    let currentMonth = now.getMonth() + 1;
    currentMonth = currentMonth > 9 ? currentMonth : `0${currentMonth}`
    let currentDate = now.getDate();
    currentDate = currentDate > 9 ? currentDate : `0${currentDate}`;
    request({
        uri: api,
        qs: {
          client_id: process.env.FOURSQUARE_CLIENT_ID,
          client_secret: process.env.FOURSQUARE_CLIENT_SECRET,
          ll: `${lat},${long}`,
          v: `${currentYear}${currentMonth}${currentDate}`
        }
      }, (err, res, body) => {
        if (err) {
            console.error('Error: ' + err);
          } else {
            let resObj = JSON.parse(body);
            console.log("second", resObj);
          }
      })
}