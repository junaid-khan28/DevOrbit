const Auth = require("../models/auth");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isValidEmail, isValidPassword } = require("../utils/verifyhttp");

exports.registerUser = async (req, res) => {
  try {
    const { name, username, password, email, phone } = req.body;

    const isUserExist = await Auth.findOne({ username });
    if (isUserExist) {
      return res.status(400).json({ message: "User already exist" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email" });
    }

    // if (!isValidPassword(password)) {
    //   return res.status(400).json({ message: "Invalid password" });
    // }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await Auth.create({
      name,
      username,
      email,
      phone,
      password: hashedPassword,
    });

    const payload = {
      id: user._id,
      role: user.role || "user", // Default role to 'user' if not specified
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      iat: new Date(1748448583 * 1000).toLocaleString(),
    });

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "Lax",
      maxAge: 3600000,
      secure: false,
    });

    return res
      .status(201)
      .json({ message: "User registered successfully", user });
  } catch (err) {
    console.error("User failed to register", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!password || (!username && !email)) {
      return res
        .status(400)
        .json({ message: "Email/Username and password is required" });
    }

    const query = username ? { username } : { email };

    const user = await Auth.findOne(query);
    if (!user) return res.status(400).json({ message: "User doesn't exist" });

    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass)
      return res
        .status(401)
        .json({ message: "Invalid credientials" })
        .redirect("/login");

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({ message: "login successfully" });
  } catch (err) {
    console.error("Couldn't login user", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};
