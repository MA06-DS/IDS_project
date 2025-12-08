from flask import Blueprint, jsonify, request
import logging
import pandas as pd
from utils.preprocessing import load_dataset, get_dataset_summary

dataset_bp = Blueprint('dataset', __name__)
logger = logging.getLogger(__name__)

@dataset_bp.route('/dataset', methods=['GET'])
def get_dataset():
    """
    Get dataset with optional pagination
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 50, max: 500)
    - summary: If 'true', return summary statistics instead of data
    
    Returns:
    {
        "success": true,
        "data": [...],
        "pagination": {
            "page": 1,
            "per_page": 50,
            "total_rows": 1000,
            "total_pages": 20
        }
    }
    """
    try:
        # Load dataset
        df = load_dataset()
        
        # Optional filters
        symbol = request.args.get('symbol')
        search = request.args.get('search', '').strip()
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Identify columns
        symbol_column = None
        if 'Name' in df.columns:
            symbol_column = 'Name'
        elif 'Symbol' in df.columns:
            symbol_column = 'Symbol'
        elif 'symbol' in df.columns:
            symbol_column = 'symbol'
        
        date_col = None
        if 'Date' in df.columns:
            date_col = 'Date'
        elif 'date' in df.columns:
            date_col = 'date'
        
        # Apply symbol filter (case-insensitive)
        if symbol and symbol_column and symbol.lower() != 'all':
            df[symbol_column] = df[symbol_column].astype(str)
            df = df[df[symbol_column].str.upper() == symbol.upper()]
        
        # Apply date filters
        if date_col and (start_date or end_date):
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                start_dt = pd.to_datetime(start_date, errors='coerce')
                if pd.notna(start_dt):
                    df = df[df[date_col] >= start_dt]
            if end_date:
                end_dt = pd.to_datetime(end_date, errors='coerce')
                if pd.notna(end_dt):
                    df = df[df[date_col] <= end_dt]
        
        # Apply search filter across all columns
        if search:
            search_lower = search.lower()
            df = df[
                df.apply(
                    lambda row: search_lower in ' '.join(
                        [str(value).lower() for value in row.values if value is not None]
                    ),
                    axis=1
                )
            ]
        
        # Check if summary requested
        if request.args.get('summary', '').lower() == 'true':
            summary = get_dataset_summary(df)
            return jsonify({
                "success": True,
                "summary": summary
            }), 200
        
        # Get pagination parameters
        page = request.args.get('page', default=1, type=int)
        per_page = request.args.get('per_page', default=50, type=int)
        
        # Validate parameters
        if page < 1:
            return jsonify({
                "success": False,
                "error": "Page must be >= 1"
            }), 400
        
        if per_page < 1 or per_page > 500:
            return jsonify({
                "success": False,
                "error": "per_page must be between 1 and 500"
            }), 400
        
        # Calculate pagination
        total_rows = len(df)
        total_pages = (total_rows + per_page - 1) // per_page
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        
        # Get page data
        page_df = df.iloc[start_idx:end_idx]
        
        # Convert to dict
        data = page_df.to_dict('records')
        
        # Clean data types
        for record in data:
            for key, value in record.items():
                if hasattr(value, 'item'):
                    record[key] = value.item()
                elif pd.isna(value):
                    record[key] = None
        
        logger.info(f"Fetched page {page} ({len(data)} records)")
        
        return jsonify({
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total_rows": total_rows,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }), 200
    
    except FileNotFoundError:
        logger.error("Dataset file not found")
        return jsonify({
            "success": False,
            "error": "Dataset not found"
        }), 500
    
    except Exception as e:
        logger.error(f"Error fetching dataset: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch dataset",
            "details": str(e)
        }), 500

@dataset_bp.route('/dataset/columns', methods=['GET'])
def get_columns():
    """
    Get list of all columns in the dataset
    
    Returns:
    {
        "success": true,
        "columns": ["Date", "Open", "High", "Low", "Close", "Volume"],
        "count": 6
    }
    """
    try:
        df = load_dataset()
        columns = df.columns.tolist()
        
        return jsonify({
            "success": True,
            "columns": columns,
            "count": len(columns)
        }), 200
    
    except Exception as e:
        logger.error(f"Error fetching columns: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to fetch columns",
            "details": str(e)
        }), 500

@dataset_bp.route('/dataset/stats', methods=['GET'])
def get_statistics():
    """
    Get statistical summary of the dataset
    
    Returns:
    {
        "success": true,
        "statistics": {
            "Open": {"mean": 150.5, "std": 10.2, "min": 120, "max": 180, ...},
            ...
        }
    }
    """
    try:
        df = load_dataset()
        
        # Get numeric columns only
        numeric_df = df.select_dtypes(include=['number'])
        
        if numeric_df.empty:
            return jsonify({
                "success": False,
                "error": "No numeric columns found"
            }), 400
        
        # Generate statistics
        stats = numeric_df.describe().to_dict()
        
        # Clean stats (convert numpy types)
        for col in stats:
            for stat in stats[col]:
                if hasattr(stats[col][stat], 'item'):
                    stats[col][stat] = stats[col][stat].item()
        
        return jsonify({
            "success": True,
            "statistics": stats
        }), 200
    
    except Exception as e:
        logger.error(f"Error generating statistics: {str(e)}")
        return jsonify({
            "success": False,
            "error": "Failed to generate statistics",
            "details": str(e)
        }), 500