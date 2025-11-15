import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  student_id: {
    type: String,
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [50, 'Department name cannot exceed 50 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    default: null
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [15, 'Phone number cannot exceed 15 characters'],
    default: null
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot exceed 200 characters'],
    default: null
  },
  city: {
    type: String,
    trim: true,
    maxlength: [50, 'City name cannot exceed 50 characters'],
    default: null
  },
  state: {
    type: String,
    trim: true,
    maxlength: [50, 'State name cannot exceed 50 characters'],
    default: null
  },
  pin: {
    type: String,
    trim: true,
    maxlength: [10, 'PIN code cannot exceed 10 characters'],
    default: null
  },
  country: {
    type: String,
    trim: true,
    maxlength: [50, 'Country name cannot exceed 50 characters'],
    default: 'India'
  },
  semester: {
    type: Number,
    min: [1, 'Semester must be at least 1'],
    max: [12, 'Semester cannot exceed 12'],
    default: null
  },
  imageUrl: {
    type: String,
    trim: true,
    default: null,
    // validate: {
    //   validator: function(v) {
    //     if (!v) return true; // Allow null/empty values
    //     // Basic URL validation
    //     return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
    //   },
    //   message: 'Image URL must be a valid HTTP/HTTPS URL ending with a supported image format (jpg, jpeg, png, gif, webp)'
    // }
  },
  status: {
    type: String,
    enum: ['in', 'out'],
    default: 'out'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isRegisteredByAdmin: {
    type: Boolean,
    default: true
  },
  rejectionReason: {
    type: String,
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  verifiedBy: {
    type: String,
    default: null
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Indexes for better performance
// Note: student_id index is automatically created due to unique: true
studentSchema.index({ status: 1 });
studentSchema.index({ department: 1 });
studentSchema.index({ name: 1 });
studentSchema.index({ semester: 1 });
studentSchema.index({ city: 1, state: 1 });

// Instance methods
studentSchema.methods.toggleStatus = function() {
  this.status = this.status === 'in' ? 'out' : 'in';
  return this.save();
};

studentSchema.methods.checkIn = function() {
  this.status = 'in';
  return this.save();
};

studentSchema.methods.checkOut = function() {
  this.status = 'out';
  return this.save();
};

// Static methods
studentSchema.statics.findByStudentId = function(studentId) {
  return this.findOne({ student_id: studentId.toUpperCase() });
};

studentSchema.statics.findByStatus = function(status) {
  return this.find({ status: status }).sort({ updatedAt: -1 });
};

studentSchema.statics.findByDepartment = function(department) {
  return this.find({ department: new RegExp(department, 'i') }).sort({ name: 1 });
};

studentSchema.statics.findBySemester = function(semester) {
  return this.find({ semester: semester }).sort({ name: 1 });
};

studentSchema.statics.findByLocation = function(city, state) {
  const query = {};
  if (city) query.city = new RegExp(city, 'i');
  if (state) query.state = new RegExp(state, 'i');
  return this.find(query).sort({ name: 1 });
};

studentSchema.statics.getStudentsInside = function() {
  return this.find({ status: 'in' }).sort({ updatedAt: -1 });
};

studentSchema.statics.getStudentsOutside = function() {
  return this.find({ status: 'out' }).sort({ updatedAt: -1 });
};

studentSchema.statics.getPendingVerifications = function() {
  return this.find({ isVerified: false, isRegisteredByAdmin: false }).sort({ createdAt: -1 });
};

studentSchema.statics.getVerifiedStudents = function() {
  return this.find({ isVerified: true }).sort({ verifiedAt: -1 });
};

studentSchema.statics.getRejectedStudents = function() {
  return this.find({ isVerified: false, rejectionReason: { $ne: null } }).sort({ updatedAt: -1 });
};

studentSchema.statics.approveStudent = async function(studentId, approvedBy) {
  const student = await this.findOne({ student_id: studentId.toUpperCase() });
  if (!student) {
    throw new Error('Student not found');
  }
  
  student.isVerified = true;
  student.verifiedAt = new Date();
  student.verifiedBy = approvedBy;
  student.rejectionReason = null;
  
  return await student.save();
};

studentSchema.statics.rejectStudent = async function(studentId, rejectionReason) {
  const student = await this.findOne({ student_id: studentId.toUpperCase() });
  if (!student) {
    throw new Error('Student not found');
  }
  
  student.isVerified = false;
  student.rejectionReason = rejectionReason;
  student.verifiedAt = null;
  student.verifiedBy = null;
  
  return await student.save();
};

studentSchema.statics.createMany = async function(studentsData) {
  try {
    // Prepare the data
    const preparedData = studentsData.map(student => ({
      student_id: student.student_id.toUpperCase(),
      name: student.name,
      department: student.department,
      email: student.email || null,
      phone: student.phone || null,
      address: student.address || null,
      city: student.city || null,
      state: student.state || null,
      pin: student.pin || null,
      country: student.country || 'India',
      semester: student.semester || null,
      imageUrl: student.imageUrl || null,
      status: 'out',
      isVerified: student.isRegisteredByAdmin !== false, // Auto-verify admin-created students
      isRegisteredByAdmin: student.isRegisteredByAdmin !== false,
      verifiedAt: student.isRegisteredByAdmin !== false ? new Date() : null,
      verifiedBy: student.verifiedBy || null
    }));

    const result = await this.insertMany(preparedData, { ordered: false });
    return { 
      success: true, 
      count: result.length, 
      students: result 
    };
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key errors
      const duplicateIds = [];
      if (error.writeErrors) {
        error.writeErrors.forEach(err => {
          if (err.err && err.err.errmsg) {
            const match = err.err.errmsg.match(/student_id: "([^"]+)"/);
            if (match) duplicateIds.push(match[1]);
          }
        });
      }
      throw new Error(`Duplicate student IDs found: ${duplicateIds.join(', ')}`);
    }
    throw error;
  }
};

// Pre-save middleware
studentSchema.pre('save', function(next) {
  // Ensure student_id is uppercase
  if (this.student_id) {
    this.student_id = this.student_id.toUpperCase();
  }
  next();
});

const Student = mongoose.model('Student', studentSchema);

export default Student;