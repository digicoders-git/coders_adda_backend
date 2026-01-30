import mongoose from "mongoose";

const courseCategorySchema = new mongoose.Schema({
  name:{
    type:String,
    required:true,
    trim:true
  },
  isActive:{
    type:Boolean,
    default:true
  }
},{timestamps:true})

const CourseCategory = mongoose.model('courseCategory',courseCategorySchema)
export default CourseCategory