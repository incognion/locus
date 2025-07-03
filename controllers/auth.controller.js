import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

const genToken = id => jwt.sign({id}, process.env.JWT_SECRET, {expiresIn:'2d'});

export const register = async (req,res)=>{
  const {name,email,password,role} = req.body;
  const user = await User.create({name,email,password,role});
  res.status(201).json({token: genToken(user._id)});
};

export const login = async (req,res)=>{
  const {email,password} = req.body;
  const user = await User.findOne({email});
  if(!user || !(await user.matchPassword(password)))
      return res.status(401).json({msg:'Invalid credentials'});
  res.json({token: genToken(user._id)});
};
