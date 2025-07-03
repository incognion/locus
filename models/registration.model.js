import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  event:{type:mongoose.Schema.Types.ObjectId, ref:'Event'},
  user:{type:mongoose.Schema.Types.ObjectId, ref:'User'},
  createdAt:{type:Date, default:Date.now}
});
export default mongoose.model('Registration', registrationSchema);
