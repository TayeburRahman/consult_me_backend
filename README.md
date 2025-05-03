# **Design Document for Jewelry E-Commerce App**

## **1. Project Overview**

**Title**: Cathys Jewelry

**Summary**:  
This app allows users to browse and purchase jewelry items, place custom orders, and manage their account details. Non-logged-in users can view the jewelry catalog and place orders, but only logged-in users can submit custom jewelry requests.

**Goals**:

- Provide a seamless shopping experience for users with both ready-made and custom jewelry options.

---

## **2. Tech Stack**

**Frontend**:

- **React.js** (for dynamic, responsive UI)
- **Redux** (for state management)
- **React Router** (for navigation)

**Backend**:

- **Node.js** with **Express.js** (for handling API requests)
- **MongoDB** (for the database to store user, product, and order data)
- **Mongoose** (for MongoDB object modeling)

**Authentication**:

- **JWT** (JSON Web Tokens) for user authentication

**Payment Integration**:

- **Stripe** (for processing payments)

**Other Tools**:

- **Cloudinary** (for image hosting)
- **Nodemailer** (for sending email notifications)

---

## **3. Features & Functional Requirements**

### 1. **User Authentication (Signup/Login)**

- **Non-logged-in users** can view the home page, product pages, and search items.
- **Logged-in users** can place orders, submit custom orders, and manage account details.
- **Sign up and login** forms with validation.
- **Password reset** functionality.

### 2. **Home Page**

- **Hero section**: Display a prominent image/banner with a CTA (e.g., "Shop Now").
- **Bestselling section**: Showcase top-selling products.
- **Popular items section**: Display popular products.
- **Testimonial section**: Show reviews and ratings from satisfied customers.

### 3. **Search Page**

- **Search bar**: Users can search for products.
- **Categories**: Display product categories (e.g., Necklaces, Rings, Bracelets).
- **Filters**:
  - Price range (slider or input field)
  - Availability (in stock or out of stock)
  - Rating (minimum rating filter)
- **Sort options**: Sort by price (high to low, low to high).

### 4. **Product Page**

- **Product images**: High-quality images of the jewelry item.
- **Customization options**: Select colors, sizes, and quantity.
- **Description**: Detailed information about the product.
- **Reviews**: Section showing user reviews and ratings, logged-in users who purchased that item can leave a review.
- **Related products**: Display similar products based on the current product.

### 5. **Category Page**

- **Subcategories**: List relevant subcategories for the user to browse further.
- **Product list**: Display products with the ability to filter by categories, price, rating, etc.

### 6. **Custom Order Page**

- **Custom order form**: A form where users can input their requirements for custom jewelry (e.g., type of jewelry, preferred materials, design specifications).

### 7. **Cart Page**

- **Cart summary**: Display items in the cart with the option to remove, modify quantity, or proceed to checkout.

### 8. **Checkout Page**

- **Shipping information**: Users enter shipping details.
- **Payment**: Integration with **Stripe** for secure payment processing.
- **Order summary**: Display a summary of the items, total cost, and shipping.

### 9. **Contact Us Page**

- **Contact form**: Allows users to submit inquiries or feedback.
- **Email**: Captures email, name, subject, and message.

### 10. **Info Pages**

- **About Us**: Information about the business and mission.
- **Terms & Conditions**: Legal terms for users.
- **Privacy Policy**: How user data is protected.
- **Shipping and Delivery**: Shipping methods, costs, and expected delivery times.
- **Returns and Exchanges**: Policy for returns and exchanges.
- **Warranty & Repairs**: Jewelry warranty and repair services.
- **Help & Support**: FAQ or customer support information.
- **FAQs**: Frequently asked questions for users.

### 11. **Profile Page**

- **User account management**:
  - Update personal details.
  - Change password.
  - Add or modify shipping address.

---

## **4. User Flow**

![user flow](https://i.imgur.com/Z4sJuQE.png)

## **5. API Routes**

[Postman Collection](https://spark-tech-1674.postman.co/workspace/Spark-Tech-Workspace~3dc67139-acf2-4e3c-bea2-20bc71e1fb41/collection/41742263-7b821d6a-406f-4e1c-aed3-befcd2bc25d3?action=share&creator=41742263&active-environment=41742263-52456c3b-afa6-488c-890f-60a06cc507bb)

---

## **6. Non-Functional Requirements**

- **Security**:
  - Use **bcrypt** for password hashing.
  - Ensure all user data is stored securely, with proper validation and sanitization of inputs.
  - Implement **JWT** for authentication.

---

## **7. Authentication and Authorization**

- **JWT** will be used to manage authentication.
- Logged-in users will have access to custom orders and profile management features.
- **Authorization middleware** will ensure that only logged-in users can place custom orders.

---

## **8. API Routes**

#### Authentication

- ✅ post /signup
- ✅ post /verify-otp
- ✅ post /resend
- ✅ post /login
- ✅ post /forgot-password
- ✅ post /reset-password
- ✅ post /refresh-token`

#### Home

- ✅ get /categories

#### Search

- ✅ get /categories
- ✅ get /products
  - params:
    - query: String
    - price_min: Number
    - price_max: Number
    - availability: in_stock | stock_out | upcoming
    - rating: Number
    - sort: low_to_high | high_to_low
    - category: ObjectId
    - sub_category: ObjectId
    - page: Number (optional)
    - limit: Number (optional)

#### Product Page
- ✅ get /product
  - response: {
    product_info,
    description,
    related products
    }
- ✅ get /get-review
  - params:
      - page: Number (optional)
      - limit: Number (optional)
- ✅ post /add-review

#### Category Page
- ✅ get /category

#### Custom Order
- ✅ post /orders/custom

#### Checkout
- ✅ post /place-order
- ✅ post /stripe/webhook

#### Favorite Page
- ✅ get /favorites
- ✅ post /favorites/update
  - params:
    - type: add | remove

#### Contact Us
- ✅ post /contact

#### Info Pages
- ✅ get /info
  - params:
    - page: about-us | terms | privacy | shipping | returns | warranty | help | faqs

#### Profile
- ✅ get /profile
- ✅ patch /profile/edit
- ✅ post /profile/change-password

#### Appointment
- ✅ get /book-appointment
- ✅ post /book-appointment

#### Admin Routes
- ✅ post /add-category
- ✅ patch /update-category
- ✅ delete /delete-category
- ✅ post /add-product
- ✅ post /edit-product
- ✅ post /delete-product
- ✅ get /users
- ✅ patch /toggle-ban-users
- ✅ get /orders
- ✅ patch /orders
- ✅ post /info
  - request: {
      page: about-us | terms | privacy | shipping | returns | warranty | help | faqs,
      content: String
    }
- ✅ get /appointments
- ✅ get /contact-us
- ✅ get /faq
- ✅ post /faq
- ✅ patch /faq 
- ✅ delete /faq
- ✅ get /dashboard
- ✅ get /notifications