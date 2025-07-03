import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const protect = async (req,res,next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if(!token) return res.status(401).json({msg:'No token'});
  try{
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    next();
  }catch(err){ return res.status(401).json({msg:'Invalid token'}); }
};

export const authorize = (...roles) => (req,res,next)=>{
  if(!roles.includes(req.user.role)) return res.status(403).json({msg:'Forbidden'});
  next();
};
