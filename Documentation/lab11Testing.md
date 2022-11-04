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
- Valid Usernames: vincent, zane, Joseph, JohnBrown, thisIsMyName, validUsername
- Valid Password: 
- Invalid Usernames: vincent!, thisusernameisjustwayyyyyyyyytoolongtobehonest, john brown
- Invalid Password:

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


