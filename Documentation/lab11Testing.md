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
  - Pass unique username to expect successful input
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




