const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const users = require('../users/userModel');

passport.use(
  new LocalStrategy({ usernameField: 'email' }, (email, password, done) => {
    const user = users.find((u) => u.email === email);
    if (!user) {
      return done(null, false, { message: 'Incorrect email.' });
    }

    bcrypt.compare(password, user.password, (err, res) => {
      if (res) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.'
