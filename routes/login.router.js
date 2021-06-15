const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require("node-fetch")
const { v4 } = require('uuid');
const router = express.Router();

const adminHeaders = {
  'x-hasura-admin-secret': "Het@v1105"
};

// const HASURA_OPERATION = `
// mutation ($id: String!, $name: String!, $email: String!, $username: String!, $password: String!) {
//   insert_users_one(object: {
//     id: $id,
//     name: $name,
//     email: $email,
//     username: $username,
//     password: $password,
//   }){
//     id
//   }
// }
// `;

const GET_USER = `
query ($email: String!) {
  users(where: {email: {_eq: $email}}) {
    email
    password
    id
    name
  }
}
`
const execute = async (variables, reqHeaders) => {
  const fetchResponse = await fetch(
    "https://social-finsight.hasura.app/v1/graphql",
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        query: HASURA_OPERATION,
        variables
      })
    }
  );
  const res = await fetchResponse.json();
  console.log('46', res);
  return res;
};

const getUser = async (email) => {
  const fetchResponse = await fetch(
    "https://social-finsight.hasura.app/v1/graphql",
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        query: GET_USER,
        variables: {
          email
        }
      })
    }
  );
  return await fetchResponse.json();
}

// const isAlreadyRegistered = async (username, email) => {
//   const response = await getAllUsernamesAndEmails();
//   const allUsernamesAndEmails = response.data.users;
//   const isRegistered = false;
//   return allUsernamesAndEmails.some(user => (user.username === username || user.email === email))
// }

router.route('/')
  .post(async (req, res) => {
    console.log("LOGIN");
    // get request input
    const { email, password } = req.body.input;

    const response = await getUser(email)

    if(response.data.users.length === 0) {
      console.log("Return email error");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials."
      })
    }
    
    const user = response.data.users[0];
    const doPasswordsMatch = await bcrypt.compare(password, user.password);

    if(!doPasswordsMatch) {
      console.log("Return password error");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials."
      })
    }

    const tokenContents = {
      sub: user.id,
      name: user.name,
      iat: Date.now() / 1000,
      iss: 'https://social-finsight.desaihetav.repl.co',
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": ["user"],
        "x-hasura-user-id": user.id,
        "x-hasura-default-role": "user",
        "x-hasura-role": "user"
      },
      exp: Math.floor(Date.now() / 1000) + (24 * 7 * 60 * 60)
    }

    const token = jwt.sign(tokenContents, process.env.ENCRYPTION_KEY);

    // success
    return res.json({
      id: user.id,
      token
    })
  })

module.exports = router;