import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email:{ type:String, unique:true, required:true },
  password:{ type:String, required:true },
  role:{ type:String, enum:['organizer','user'], default:'user' }
});

userSchema.pre('save', async function(){
  if(!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (pwd){
  return bcrypt.compare(pwd, this.password);
};

export default mongoose.model('User', userSchema);
