People planning a trip will be the target users of our web service.

All tests will be performed in the development enviroment.

User Test Acceptance Cases:
Home Page:
- Test for successful rendering of login/register page
- Test for saved user session

Register Page:
- Test for successful rendering landing page
- Test for rendering login page if user says they already have an account 

Register Endpoint:
- Test for repeat Username
  - Pass unique username to expect successful input into database
  - Pass repeat username to throw "username already exists error" and disable submit button
- Test for meeting password requirements
  - Best practice for strong passwords 
  - Pass "good" password to expect successful input
  - Pass "bad" password to throw "password does not meet requirement" and disable submit button
- Test for valid email address using bootstrap form control
  - Pass valid email address to expect successful input
  - Pass invalid email address to throw "invalid email address" and disable submit button
- Test Captcha
- Test for all required fields of form
  - Pass complete form to expect successful registration
  - Pass incomplete form to throw "complete form" and disable submit button 

Register Test Cases:
- Valid: {username: vincent, password: myPassword123!, email: vincent@vincentbowen.com}, expect 200
- Invalid: {username: john brown, password: , email: johnbrown@colorado.edu}, expect 400

Login Page;
- Test for successful rendering of landing page 
- Test for rendering register page if user says they need to register a new account

Login Endpoint:
- Test for all required fields of form
  - Pass complete form to expect successful registration
  - Pass incomplete form to throw "complete form" and disable submit button 
- Test that username matches database
  - Pass matching username and password to expect successful login
  - Pass matching username and not matching password to throw "invalid username/password"
- Test that username does not match database
  - Pass not matching username to throw "invalid username/password"
 
Login Test Cases:
- Valid: {username: vincent, password: myPassword123!, email: vincent@vincentbowen.com}, expect 200
- Invalid: {username: john brown, password: , email: johnbrown@colorado.edu}, expect 400

Calendar:
- Test for all required fields of add event form
  - Pass complete form to expect successful add of event
  - Pass incomplete form to throw "please complete required fields" and disable submit button
- Test for valid date/time
  - Pass valid date/time to expect no error 
  - Pass invalid date/time to throw "please enter a valid date" and disable submit button 
- Test for overlapping times 
  - Pass non-overlapping times to expect no error
  - Pass overlapping times to throw "times cannot overlap for events" 

Calendar Test Cases:
- Valid: {Hiking, 11/01/2021, 3:00 PM - 4:00PM, Hiking the flatirons}
- Invalid: { , 11/01/1989, 1:00 AM - 2:00 AM}, {Kayaking, 11/01/2021, 3:30PM - 5:30 PM (if valid case is already inputed), kayaking at the bay)

Weather API Endpoint:
- Test for valid return coordinates
  - Pass valid coordinates to expect calling coordinate to city API
  - Pass invalid coordinates to throw error, and show user "coordinates do not exist"
- Test for valid inputs in search feature
  - Pass valid inputs in search to expect results displayed on webpage
  - Pass invalid inputs in search to throw error, and show user "input valid search criteria"

Weather API Test Cases:
- Finalize JSON output to determine valid and invalid inputs and respective returns

Coordinate to City API Endpoint:
- Test for valid City Return
  - Pass valid coordinates to expect return to user of city or closes city
  - Do not need to test invalid coordinates, as weather API return will already be tested for this

Coordinate to City API Test Cases:
- Valid {40.4406° N, 79.9959° W}
  - Return {Pittsburgh, Pa, USA} (JSON output may be slightly different)
- Valid {43.7696° N, 11.2558° E}
  - Return {Florence, Italy} (JSON output may be slightly different)

Flight API Endpoint:
- Test for calling showing results when valid search criteria


Flight API Test Cases:
- Finalize JSON output, deciding between amadeus API and FlightLabs

