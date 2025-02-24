import os
import torch

from fairseq import checkpoint_utils


def get_index_path_from_model(sid):
    return next(
        (
            f
            for f in [
                os.path.join(root, name)
                for root, _, files in os.walk(os.getenv("index_root"), topdown=False)
                for name in files
                if name.endswith(".index") and "trained" not in name
            ]
            if sid.split(".")[0] in f
        ),
        "",
    )


def load_hubert(config):
    # Add safe globals for fairseq dictionary and other required classes
    torch.serialization.add_safe_globals([
        ('fairseq.data.dictionary', 'Dictionary'),
        ('fairseq.tasks.hubert_pretraining', 'HubertPretrainingConfig'),
        ('fairseq.models.hubert.hubert', 'HubertConfig'),
        ('fairseq.dataclass.utils', 'FairseqDataclass')
    ])
    
    # Override the default weights_only behavior
    import functools
    original_load = torch.load
    torch.load = functools.partial(original_load, weights_only=False)
    
    try:
        models, _, _ = checkpoint_utils.load_model_ensemble_and_task(
            ["assets/hubert/hubert_base.pt"],
            suffix="",
        )
        hubert_model = models[0]
        hubert_model = hubert_model.to(config.device)
        if config.is_half:
            hubert_model = hubert_model.half()
        else:
            hubert_model = hubert_model.float()
        return hubert_model.eval()
    finally:
        # Restore original torch.load
        torch.load = original_load
