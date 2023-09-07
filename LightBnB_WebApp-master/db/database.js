const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require("pg");

const pool = new Pool({
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function (email) {
  return pool
    .query(`SELECT * FROM users WHERE email = $1`, [email])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function (id) {
  return pool
    .query(`SELECT * FROM users WHERE id= $1`, [id])
    .then(result => result.rows[0] || null)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function (user) {
  const { name, email, password } = user;
  return pool
    .query(`INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *`, [name, email, password])
    .then(result => result.rows[0])
    .catch(err => {
      console.log(err.message);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function (guest_id, limit = 10) {
  const queryString = `
  SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1 AND reservations.start_date > Now()::date
  GROUP BY properties.id, reservations.id
  ORDER BY start_date
  LIMIT $2`;
  return pool
    .query(queryString, [guest_id, limit])
    .then((result) => result.rows)
    .catch(err => {
      console.log(err.message);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
  // Setup an array to hold any parameters that may be available for the query.
  const queryParams = [];

  // Start the query with all information that comes before the WHERE clause.
  let queryString = `
  SELECT properties.*, AVG(property_reviews.rating) AS average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // Check if a city has been passed in as an option. Add the city to the params array and create a WHERE clause for the city.
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city Like $${queryParams.length} `;
  }

  // If an owner_id is passed in, only return properties belonging to that owner.
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    if (queryParams.length === 1) {
      queryString += `WHERE owner_id = $${queryParams.length} `;
    } else {
      queryString += `AND owner_id = $${queryParams.length} `;
    }
  }

  // If a minimum_price_per_night and a maximum_price_per_night, only return properties within that price range.
  if (options.minimum_price_per_night) {
    queryParams.push(options.minimum_price_per_night * 100);
    if (queryParams.length === 1) {
      queryString += `WHERE cost_per_night >= $${queryParams.length} `;
    } else {
      queryString += `AND cost_per_night >= $${queryParams.length} `;
    }
  }

  if (options.maximum_price_per_night) {
    queryParams.push(options.maximum_price_per_night * 100);
    if (queryParams.length === 1) {
      queryString += `WHERE cost_per_night <= $${queryParams.length} `;
    } else {
      queryString += `AND cost_per_night <= $${queryParams.length} `;
    }
  }

  // If a minimum_rating is passed in, only return properties with an average rating equal to or higher than that.
  if (options.minimum_rating) {
    queryParams.push(options.minimum_rating);
    if (queryParams.length === 1) {
      queryString += `WHERE property_reviews.rating >= $${queryParams.length} `;
    } else {
      queryString += `AND property_reviews.rating >= $${queryParams.length} `;
    }
  }

  // Add any query that comes after the WHERE clause.
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // Console log everything just to make sure we've done it right.
  console.log(queryString, queryParams);

  // Run the query.
  return pool
    .query(queryString, queryParams)
    .then((res) => res.rows)
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function (property) {
  return pool
    .query(`INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)  
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        property.owner_id,
        property.title,
        property.description,
        property.thumbnail_photo_url,
        property.cover_photo_url,
        property.cost_per_night,
        property.street,
        property.city,
        property.province,
        property.post_code,
        property.country,
        property.parking_spaces,
        property.number_of_bathrooms,
        property.number_of_bedrooms
      ])
    .then(result => result.rows)
    .catch(err => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
