import Category from '../models/Category.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId } from '../utils/helpers.js';

export const getCategories = async (req, res, next) => {
  try {
    const { parent } = req.query;
    const query = { isActive: true };
    
    // If parent query param is provided, filter by parent
    if (parent !== undefined) {
      if (parent === 'null' || parent === '') {
        query.parent = null; // Get only top-level categories
      } else if (isValidObjectId(parent)) {
        query.parent = parent; // Get categories with specific parent
      } else {
        throw new AppError('Invalid parent category ID', 400);
      }
    }

    const categories = await Category.find(query)
      .populate('parent', 'name slug')
      .sort({ order: 1, name: 1 });

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    next(error);
  }
};

export const getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      $or: [
        { _id: req.params.id },
        { slug: req.params.id }
      ],
      isActive: true
    }).populate('parent', 'name slug');

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    res.json({
      success: true,
      category
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { parent, ...categoryData } = req.body;
    
    // Validate parent if provided
    if (parent) {
      if (!isValidObjectId(parent)) {
        throw new AppError('Invalid parent category ID format', 400);
      }
      
      const parentCategory = await Category.findById(parent);
      if (!parentCategory) {
        throw new AppError('Parent category not found', 404);
      }
      
      if (!parentCategory.isActive) {
        throw new AppError('Parent category is not active', 400);
      }
      
      categoryData.parent = parent;
    } else {
      categoryData.parent = null;
    }

    const category = await Category.create(categoryData);

    res.status(201).json({
      success: true,
      category: await Category.findById(category._id).populate('parent', 'name slug')
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Category with this name already exists', 400));
    }
    if (error instanceof AppError) {
      return next(error);
    }
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid category ID format', 400);
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    const { parent, ...updateData } = req.body;
    
    // Validate parent if provided
    if (parent !== undefined) {
      if (parent === null || parent === '') {
        updateData.parent = null;
      } else {
        if (!isValidObjectId(parent)) {
          throw new AppError('Invalid parent category ID format', 400);
        }
        
        // Prevent circular reference: cannot set itself as parent
        if (parent === req.params.id) {
          throw new AppError('Category cannot be its own parent', 400);
        }
        
        const parentCategory = await Category.findById(parent);
        if (!parentCategory) {
          throw new AppError('Parent category not found', 404);
        }
        
        if (!parentCategory.isActive) {
          throw new AppError('Parent category is not active', 400);
        }
        
        // Prevent circular reference: check if parent is a descendant of this category
        const checkCircularReference = async (categoryId, potentialParentId) => {
          // If trying to set the category as its own parent, that's a circular reference
          if (categoryId === potentialParentId) {
            return true;
          }
          
          // Traverse up the parent chain to see if we encounter the category being updated
          let currentParentId = potentialParentId;
          const visited = new Set();
          
          while (currentParentId) {
            // If we find the category being updated in the parent chain, it's circular
            if (currentParentId === categoryId) {
              return true;
            }
            
            // Prevent infinite loops
            if (visited.has(currentParentId)) {
              break;
            }
            visited.add(currentParentId);
            
            const parentCat = await Category.findById(currentParentId);
            if (!parentCat || !parentCat.parent) {
              break;
            }
            currentParentId = parentCat.parent.toString();
          }
          
          return false;
        };
        
        const isCircular = await checkCircularReference(req.params.id, parent);
        if (isCircular) {
          throw new AppError('Cannot set a descendant category as parent (circular reference)', 400);
        }
        
        updateData.parent = parent;
      }
    }

    Object.assign(category, updateData);
    await category.save();

    res.json({
      success: true,
      category: await Category.findById(category._id).populate('parent', 'name slug')
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new AppError('Category with this name already exists', 400));
    }
    if (error instanceof AppError) {
      return next(error);
    }
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid category ID format', 400);
    }

    const category = await Category.findById(req.params.id);

    if (!category) {
      throw new AppError('Category not found', 404);
    }

    // Check if category has children
    const childCount = await Category.countDocuments({ parent: req.params.id });
    if (childCount > 0) {
      throw new AppError(`Cannot delete category with ${childCount} child categor${childCount > 1 ? 'ies' : 'y'}. Please delete or reassign child categories first.`, 400);
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    next(error);
  }
};
