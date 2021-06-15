const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = require("node-fetch")
const { v4 } = require('uuid');
const router = express.Router();

const adminHeaders = {
  'x-hasura-admin-secret': "Het@v1105"
};

const HASURA_OPERATION = `
mutation ($id: uuid!, $name: String!, $email: String!, $username: String!, $password: String!) {
  insert_users_one(object: {
    id: $id,
    name: $name,
    email: $email,
    username: $username,
    password: $password,
  }){
    id
  }
}
`;

const GET_ALL_USERNAMES_AND_EMAILS = `
query {
  users {
    username,
    email
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

const getAllUsernamesAndEmails = async (reqHeaders) => {
  const fetchResponse = await fetch(
    "https://social-finsight.hasura.app/v1/graphql",
    {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        query: GET_ALL_USERNAMES_AND_EMAILS,
      })
    }
  );
  return await fetchResponse.json();
}

const isAlreadyRegistered = async (username, email) => {
  const response = await getAllUsernamesAndEmails();
  const allUsernamesAndEmails = response.data.users;
  const isRegistered = false;
  return allUsernamesAndEmails.some(user => (user.username === username || user.email === email))
}

router.route('/')
  .post(async (req, res) => {
    console.log("here");
    // get request input
    const { name, username, email, password } = req.body.input;

    const isRegistered = await isAlreadyRegistered(username, email);

    console.log(isRegistered);

    if (isRegistered) {
      console.log("Return error");
      return res.status(401).json({
        success: false,
        message: "User with entered email or username already exists."
      })
    }

    const uniqueId = v4();
    let data;

    try {
      // run some business logic
      let hashedPassword = await bcrypt.hash(password, 10);
      // execute the Hasura operation
      const dataResponse = await execute({ id: uniqueId, name, username, email, password: hashedPassword }, adminHeaders);
      data = dataResponse.data;
    } catch (error) {
      console.log(error);
      return res.status(400).json({
        message: "Something went wrong."
      })
    }

    const tokenContents = {
      sub: uniqueId,
      name: name,
      iat: Date.now() / 1000,
      iss: 'https://social-finsight.desaihetav.repl.co',
      "https://hasura.io/jwt/claims": {
        "x-hasura-allowed-roles": ["user"],
        "x-hasura-user-id": uniqueId,
        "x-hasura-default-role": "user",
        "x-hasura-role": "user"
      },
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    }

    const token = jwt.sign(tokenContents, process.env.ENCRYPTION_KEY);

    // success
    return res.json({
      ...data.insert_users_one,
      token: token
    })
  })

module.exports = router;