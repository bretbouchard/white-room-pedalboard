"""
Setup script for daid-core Python package
"""

from setuptools import find_packages, setup

with open("README.md", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="daid-core",
    version="1.0.0",
    author="DAID Project",
    author_email="daid@example.com",
    description="Python bindings for DAID (Distributed Agent Identifier) provenance system",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/daid-project/daid-core",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries :: Python Modules",
        "Topic :: System :: Distributed Computing",
    ],
    python_requires=">=3.8",
    install_requires=[
        "requests>=2.25.0",
    ],
    extras_require={
        "dev": [
            "pytest>=6.0",
            "pytest-cov>=2.0",
            "pytest-asyncio>=0.21.0",
            "black>=21.0",
            "flake8>=3.8",
            "mypy>=0.800",
        ],
        "fastapi": [
            "fastapi>=0.68.0",
            "uvicorn>=0.15.0",
        ],
        "websocket": [
            "websockets>=10.0",
        ],
        "all": [
            "fastapi>=0.68.0",
            "uvicorn>=0.15.0",
            "websockets>=10.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "daid-cli=daid_core.cli:main",
        ],
    },
)
