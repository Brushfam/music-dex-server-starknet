const app = require('./app');
require("dotenv").config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running!`);
});