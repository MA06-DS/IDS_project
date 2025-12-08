import pickle
import os
import logging

logger = logging.getLogger(__name__)

class ModelLoader:
    """Singleton class to load and cache ML models"""
    _instance = None
    _model = None
    _label_encoder = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
        return cls._instance
    
    def load_model(self, model_path=None):
        """Load the trained model"""
        if self._model is None:
            try:
                # Default to model.pkl in backend directory
                if model_path is None:
                    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    model_path = os.path.join(backend_dir, 'model.pkl')
                
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"Model file not found: {model_path}")
                
                with open(model_path, 'rb') as f:
                    self._model = pickle.load(f)
                
                logger.info(f"Model loaded successfully from {model_path}")
            except Exception as e:
                logger.error(f"Error loading model: {str(e)}")
                raise
        
        return self._model
    
    def load_label_encoder(self, encoder_path=None):
        """Load the label encoder for stock names"""
        if self._label_encoder is None:
            try:
                # Default to labelencoder_name.pkl in backend directory
                if encoder_path is None:
                    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
                    encoder_path = os.path.join(backend_dir, 'labelencoder_name.pkl')
                
                if not os.path.exists(encoder_path):
                    raise FileNotFoundError(f"Label encoder not found: {encoder_path}")
                
                with open(encoder_path, 'rb') as f:
                    self._label_encoder = pickle.load(f)
                
                logger.info(f"Label encoder loaded successfully from {encoder_path}")
            except Exception as e:
                logger.error(f"Error loading label encoder: {str(e)}")
                raise
        
        return self._label_encoder
    
    def get_stock_names(self):
        """Get list of all available stock names"""
        encoder = self.load_label_encoder()
        try:
            # Get classes from label encoder
            if hasattr(encoder, 'classes_'):
                return encoder.classes_.tolist()
            else:
                logger.warning("Label encoder doesn't have classes_ attribute")
                return []
        except Exception as e:
            logger.error(f"Error getting stock names: {str(e)}")
            return []
    
    def encode_stock_name(self, stock_name):
        """Encode stock name to numeric value"""
        encoder = self.load_label_encoder()
        try:
            encoded = encoder.transform([stock_name])[0]
            return encoded
        except Exception as e:
            logger.error(f"Error encoding stock name '{stock_name}': {str(e)}")
            raise ValueError(f"Invalid stock name: {stock_name}")
    
    def decode_stock_name(self, encoded_value):
        """Decode numeric value to stock name"""
        encoder = self.load_label_encoder()
        try:
            decoded = encoder.inverse_transform([encoded_value])[0]
            return decoded
        except Exception as e:
            logger.error(f"Error decoding stock value '{encoded_value}': {str(e)}")
            raise ValueError(f"Invalid encoded value: {encoded_value}")

# Global instance
model_loader = ModelLoader()