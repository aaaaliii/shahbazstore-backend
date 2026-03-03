import HeaderLink from '../models/HeaderLink.js';
import { AppError } from '../utils/errors.js';
import { isValidObjectId } from '../utils/helpers.js';
import { validateHeaderLinkUrl } from '../config/routes.js';

export const getHeaderLinks = async (req, res, next) => {
  try {
    const links = await HeaderLink.find({ isActive: true })
      .sort({ order: 1 });

    res.json({
      success: true,
      links
    });
  } catch (error) {
    next(error);
  }
};

export const getAllHeaderLinks = async (req, res, next) => {
  try {
    const links = await HeaderLink.find()
      .sort({ order: 1 });

    res.json({
      success: true,
      links
    });
  } catch (error) {
    next(error);
  }
};

export const createHeaderLink = async (req, res, next) => {
  try {
    // Validate URL
    const validation = validateHeaderLinkUrl(req.body.url, req.body.openInNewTab || false);
    if (!validation.valid) {
      throw new AppError(validation.error, 400);
    }

    const link = await HeaderLink.create(req.body);

    res.status(201).json({
      success: true,
      link
    });
  } catch (error) {
    next(error);
  }
};

export const updateHeaderLink = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid header link ID format', 400);
    }

    const link = await HeaderLink.findById(req.params.id);

    if (!link) {
      throw new AppError('Header link not found', 404);
    }

    // Validate URL if it's being updated
    if (req.body.url !== undefined) {
      const openInNewTab = req.body.openInNewTab !== undefined 
        ? req.body.openInNewTab 
        : link.openInNewTab;
      const validation = validateHeaderLinkUrl(req.body.url, openInNewTab);
      if (!validation.valid) {
        throw new AppError(validation.error, 400);
      }
    }

    Object.assign(link, req.body);
    await link.save();

    res.json({
      success: true,
      link
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHeaderLink = async (req, res, next) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      throw new AppError('Invalid header link ID format', 400);
    }

    const link = await HeaderLink.findById(req.params.id);

    if (!link) {
      throw new AppError('Header link not found', 404);
    }

    await link.deleteOne();

    res.json({
      success: true,
      message: 'Header link deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const reorderHeaderLinks = async (req, res, next) => {
  try {
    const { links } = req.body;

    if (!Array.isArray(links)) {
      throw new AppError('Links must be an array', 400);
    }

    // Update order for each link
    const updatePromises = links.map((link, index) => 
      HeaderLink.findByIdAndUpdate(link.id, { order: index })
    );

    await Promise.all(updatePromises);

    const updatedLinks = await HeaderLink.find()
      .sort({ order: 1 });

    res.json({
      success: true,
      links: updatedLinks
    });
  } catch (error) {
    next(error);
  }
};
